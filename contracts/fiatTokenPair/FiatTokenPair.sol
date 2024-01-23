// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IListingsHandler} from "../listings/interfaces/IListingsHandler.sol";
import {IListingsEventHandler} from "../listings/interfaces/IListingsEventHandler.sol";
import {IListingsEventHandlerErrors} from "../listings/interfaces/IListingsEventHandlerErrors.sol";
import {ListingsUserRoleHandler} from "../listings/libraries/ListingsUserRoleHandler.sol";

import {OrderStatusHandler} from "../orders/libraries/OrderStatusHandler.sol";
import {IOrdersEventHandler} from "../orders/interfaces/IOrdersEventHandler.sol";
import {IOrdersEventHandlerErrors} from "../orders/interfaces/IOrdersEventHandlerErrors.sol";
import {IOrdersHandler} from "../orders/interfaces/IOrdersHandler.sol";

import {ListingAction, OrderStatus, UserRole} from "../utils/enums.sol";
import {Listing, Order, OrderStatusTree, FixedPoint} from "../utils/structs.sol";
import {Math} from "../utils/libraries/Math.sol";
import {FixedPointMath} from "../utils/libraries/FixedPointMath.sol";
import {TransformUintToInt} from "../utils/libraries/TransformUintToInt.sol";
import {Ownable} from "../utils/Ownable.sol";

import {IFiatTokenPair} from "./interfaces/IFiatTokenPair.sol";
import {TokenHandler} from "../TokenHandler.sol";
import {IWhitelistedUsersDatabase} from "../whitelistedUsersDatabase/interfaces/IWhitelistedUsersDatabase.sol";
import {CurrencySettingsConsumer} from "../currencySettings/CurrencySettingsConsumer.sol";

contract FiatTokenPair is
    TokenHandler,
    CurrencySettingsConsumer,
    Ownable,
    IFiatTokenPair,
    IListingsEventHandler,
    IListingsEventHandlerErrors,
    IOrdersEventHandler,
    IOrdersEventHandlerErrors
{
    using OrderStatusHandler for OrderStatus[];
    using FixedPointMath for FixedPoint;
    using TransformUintToInt for uint8;
    using ListingsUserRoleHandler for address;

    string public pairSymbol;

    IListingsHandler public listingsHandler;
    IOrdersHandler public ordersHandler;

    modifier onlyOnOrderEvent() {
        if (_msgSender() != address(ordersHandler)) {
            revert NotOrdersHandler(_msgSender(), address(ordersHandler));
        }

        _;
    }

    modifier onlyOnListingEvent() {
        if (_msgSender() != address(listingsHandler)) {
            revert NotListingsHandler(_msgSender(), address(listingsHandler));
        }

        _;
    }

    constructor(
        string memory _pairSymbol,
        address token,
        address currencySettings,
        address owner
    ) TokenHandler(token) CurrencySettingsConsumer(currencySettings) Ownable(owner) {
        pairSymbol = _pairSymbol;
    }

    /**
     * Private functions
     */
    function calculateTotalTokenPrice(
        uint256 tokenAmount,
        uint256 pricePerToken
    ) private view returns (uint256) {
        FixedPoint memory tokenAmountFP = FixedPoint(tokenAmount, getDecimals());
        FixedPoint memory pricePerTokenFP = FixedPoint(pricePerToken, getCurrencyDecimals());

        return
            Math.max(
                tokenAmountFP.mul(pricePerTokenFP),
                Math.multiplyByTenPow(1, pricePerTokenFP.decimals.toInt())
            );
    }

    function allOrdersHaveStatus(
        uint256 listingId,
        OrderStatus[] memory statuses
    ) private view returns (bool) {
        Order[] memory orders = ordersHandler.getListingOrders(listingId);

        for (uint256 i = 0; i < orders.length; i++) {
            OrderStatus orderStatus = orders[i].statusHistory.getCurrentStatus();

            if (!statuses.statusExists(orderStatus)) {
                return false;
            }
        }

        return true;
    }

    /**
     * External functions
     */
    function setListingsHandler(address _listingsHandler) external onlyOwner {
        listingsHandler = IListingsHandler(_listingsHandler);
    }

    function setOrdersHandler(address _ordersHandler) external onlyOwner {
        ordersHandler = IOrdersHandler(_ordersHandler);
    }

    /**
     * IListingsEventHandler functions
     */
    function onListingCreated(Listing memory listing) external onlyOnListingEvent {
        if (listing.action != ListingAction.Sell) return;

        transferFromUser(listing.creator, listing.totalTokenAmount);
    }

    function onListingUpdated(
        uint256 previousAmount,
        Listing memory listing
    ) external onlyOnListingEvent {
        if (listing.action != ListingAction.Sell) return;

        if (listing.totalTokenAmount > previousAmount) {
            transferFromUser(listing.creator, listing.totalTokenAmount - previousAmount);
        } else if (previousAmount > listing.totalTokenAmount) {
            transferToUser(listing.creator, previousAmount - listing.totalTokenAmount);
        }
    }

    function onListingDeleted(Listing memory listing) external onlyOnListingEvent {
        if (listing.action != ListingAction.Sell) return;

        transferToUser(listing.creator, listing.availableTokenAmount);
    }

    /**
     * IListingsEventHandler view functions
     */
    function beforeListingCreate(
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) external view {
        if (minPricePerOrder == 0) {
            revert ListingMinPerOrderIsZero();
        }

        if (minPricePerOrder > maxPricePerOrder) {
            revert ListingMinPerOrderGreaterThanMaxPerOrder(minPricePerOrder, maxPricePerOrder);
        }

        uint256 totalPrice = calculateTotalTokenPrice(totalTokenAmount, price);

        if (maxPricePerOrder > totalPrice) {
            revert ListingMaxPerOrderGreaterThanTotalPrice(maxPricePerOrder, totalPrice);
        }
    }

    function beforeListingUpdate(uint256 listingId) external view {
        OrderStatus[] memory possibleOrders = new OrderStatus[](1);
        possibleOrders[0] = OrderStatus.Cancelled;

        if (!allOrdersHaveStatus(listingId, possibleOrders)) {
            revert ListingCannotBeUpdated(listingId);
        }
    }

    function beforeListingDelete(uint256 listingId) external view {
        OrderStatus[] memory possibleOrders = new OrderStatus[](2);
        possibleOrders[0] = OrderStatus.Cancelled;
        possibleOrders[1] = OrderStatus.Completed;

        if (!allOrdersHaveStatus(listingId, possibleOrders)) {
            revert ListingCannotBeDeleted(listingId);
        }
    }

    /**
     * IOrdersEventHandler functions
     */
    function onOrderAccepted(Order memory order) external onlyOnOrderEvent {
        OrderStatus status = order.statusHistory.getCurrentStatus();
        Listing memory listing = getListing(order.listingId);

        if (status == OrderStatus.AssetsConfirmed) {
            if (listing.availableTokenAmount < order.tokenAmount) {
                revert OrderAmountGreaterThanListingAvailableAmount(
                    order.tokenAmount,
                    listing.availableTokenAmount
                );
            }

            listingsHandler.subtractListingAvailableAmount(order.listingId, order.tokenAmount);
        } else if (status == OrderStatus.TokensDeposited) {
            transferFromUser(order.creator, order.tokenAmount);
        } else if (status == OrderStatus.Completed) {
            if (listing.action == ListingAction.Sell) {
                transferToUser(order.creator, order.tokenAmount);
            }

            if (listing.action == ListingAction.Buy) {
                transferToUser(listing.creator, order.tokenAmount);
            }
        }
    }

    function onOrderRejected(Order memory order) external onlyOnOrderEvent {
        if (order.statusHistory.getCurrentStatus() != OrderStatus.Cancelled) return;

        if (order.statusHistory.statusExists(OrderStatus.AssetsConfirmed)) {
            listingsHandler.addListingAvailableAmount(order.listingId, order.tokenAmount);
        }

        if (order.statusHistory.statusExists(OrderStatus.TokensDeposited)) {
            transferToUser(order.creator, order.tokenAmount);
        }
    }

    /**
     * IOrdersEventHandler view functions
     */
    function getListing(uint256 listingId) public view returns (Listing memory) {
        return listingsHandler.getListing(listingId);
    }

    function calculateOrderPrice(
        uint256 listingId,
        uint256 tokenAmount
    ) external view returns (uint256) {
        Listing memory listing = getListing(listingId);

        return calculateTotalTokenPrice(tokenAmount, listing.price);
    }

    function beforeOrderCreate(uint256 listingId, uint256 tokenAmount) external view {
        Listing memory listing = getListing(listingId);

        uint256 fiatAmount = calculateTotalTokenPrice(tokenAmount, listing.price);

        uint256 minOrderAmount = Math.min(
            listing.minPricePerOrder,
            calculateTotalTokenPrice(listing.availableTokenAmount, listing.price)
        );

        if (fiatAmount < minOrderAmount) {
            revert OrderAmountLessThanListingMinPerOrder(fiatAmount, minOrderAmount);
        }

        if (listing.maxPricePerOrder < fiatAmount) {
            revert OrderAmountGreaterThanListingMaxPerOrder(fiatAmount, listing.maxPricePerOrder);
        }
    }

    function computeOrderConfirmationStatus(
        uint256 orderId,
        address sender
    ) external view returns (OrderStatus) {
        Order memory order = ordersHandler.getOrder(orderId);
        Listing memory listing = getListing(order.listingId);

        return
            order.statusHistory.getNextStatus(
                sender.getUserRole(order, listing),
                listing.action,
                OrderStatusTree({
                    listingCreatorSellingStatuses: [
                        OrderStatus.AssetsConfirmed,
                        OrderStatus.Completed
                    ],
                    listingCreatorBuyingStatuses: [
                        OrderStatus.AssetsConfirmed,
                        OrderStatus.PaymentSent
                    ],
                    orderCreatorSellingStatuses: [
                        OrderStatus.TokensDeposited,
                        OrderStatus.Completed
                    ],
                    orderCreatorBuyingStatuses: [OrderStatus.PaymentSent]
                })
            );
    }

    function computeOrderCancellationStatus(
        uint256 orderId,
        address sender
    ) external view returns (OrderStatus) {
        Order memory order = ordersHandler.getOrder(orderId);
        Listing memory listing = getListing(order.listingId);

        return
            order.statusHistory.getNextStatus(
                sender.getUserRole(order, listing),
                listing.action,
                OrderStatusTree({
                    listingCreatorSellingStatuses: [OrderStatus.Cancelled, OrderStatus.InDispute],
                    listingCreatorBuyingStatuses: [OrderStatus.Cancelled, OrderStatus.Cancelled],
                    orderCreatorSellingStatuses: [OrderStatus.Cancelled, OrderStatus.InDispute],
                    orderCreatorBuyingStatuses: [OrderStatus.Cancelled]
                })
            );
    }

    /**
     * External view functions
     */
    function getListingsHandlerAddress() external view returns (address) {
        return address(listingsHandler);
    }

    function getOrdersHandlerAddress() external view returns (address) {
        return address(ordersHandler);
    }
}
