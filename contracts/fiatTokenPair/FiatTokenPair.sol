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

    /**
     * @dev Immutable representative value of the pair symbol. It's used to
     * identify the pair in the FiatTokenPairFactory by generating a hash
     * of the pair symbol.
     */
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
                // We set the minimum price to be 1 full currency unit
                // to avoid possibly rounding to 0
                Math.multiplyByTenPow(1, pricePerTokenFP.decimals.toInt())
            );
    }

    /**
     * Checks if all orders for a listing have a status in the given array
     * @param listingId of the Listing to check
     * @param statuses Array of possible OrderStatus values
     */
    function allOrdersHaveStatus(
        uint256 listingId,
        OrderStatus[] memory statuses
    ) private view returns (bool) {
        Order[] memory orders = ordersHandler.getListingOrders(listingId, 750);

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

    /**
     * If a user created a sell listing, we need to transfer the tokens
     * that are being sold to the contract as an escrow deposit.
     * @param listing Listing that was created
     */
    function onListingCreated(Listing memory listing) external onlyOnListingEvent {
        if (listing.action != ListingAction.Sell) return;

        transferFromUser(listing.creator, listing.totalTokenAmount);
    }

    /**
     * If a user updated a sell listing, we need to correct the amount of
     * tokens deposited in the contract if the total amount of tokens
     * changed.
     * @param previousAmount Previous amount of tokens in the listing
     * @param listing Listing that was updated
     */
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

    /**
     * If a user deleted a sell listing, we need to transfer the tokens
     * that were not sold back to the user.
     * @param listing Listing that was deleted
     */
    function onListingDeleted(Listing memory listing) external onlyOnListingEvent {
        if (listing.action != ListingAction.Sell) return;

        transferToUser(listing.creator, listing.availableTokenAmount);
    }

    /**
     * IListingsEventHandler view functions
     */

    /**
     *  @dev Checks whether the listing data is valid. If not, it reverts.
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

    /**
     *  @dev Checks whether the listing can be updated. If not, it reverts.
     */
    function beforeListingUpdate(uint256 listingId) external view {
        OrderStatus[] memory accepted = new OrderStatus[](1);
        accepted[0] = OrderStatus.Cancelled;

        if (!allOrdersHaveStatus(listingId, accepted)) {
            revert ListingCannotBeUpdated(listingId);
        }
    }

    /**
     *  @dev Checks whether the listing can be deleted. If not, it reverts.
     */
    function beforeListingDelete(uint256 listingId) external view {
        OrderStatus[] memory accepted = new OrderStatus[](2);
        accepted[0] = OrderStatus.Cancelled;
        accepted[1] = OrderStatus.Completed;

        if (!allOrdersHaveStatus(listingId, accepted)) {
            revert ListingCannotBeDeleted(listingId);
        }
    }

    /**
     * IOrdersEventHandler functions
     */

    /**
     * @dev Triggers the next event based on the current status of the order
     *  - Assets confirmed: subtracts the amount of tokens from the listing, if
     *   there are enough tokens available, otherwise it reverts.
     * - Tokens deposited: transfers the tokens from the order creator to the
     *   contract as an escrow deposit.
     * - Completed: transfers the tokens from the contract to the right buyer
     *
     * @param order Order that was accepted
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

    /**
     * @dev Triggers the next event based on the statuses that transpired
     *  - Assets confirmed: adds the amount of tokens back to the listing
     *  - Tokens deposited: transfers the tokens from the contract back to the
     *    order creator
     *
     * @param order Order that was rejected
     */
    function onOrderRejected(Order memory order) external onlyOnOrderEvent {
        if (order.statusHistory.getCurrentStatus() != OrderStatus.Cancelled) return;

        if (order.statusHistory.statusExists(OrderStatus.AssetsConfirmed)) {
            listingsHandler.addListingAvailableAmount(order.listingId, order.tokenAmount);
        }

        // TokensDeposited status can only be reached in the ListingAction.Buy case
        // in which case, we know that the order creator is the seller
        if (order.statusHistory.statusExists(OrderStatus.TokensDeposited)) {
            transferToUser(order.creator, order.tokenAmount);
        }
    }

    /**
     * IOrdersEventHandler view functions
     */

    /**
     * @dev Returns the listing from the listing handler
     */
    function getListing(uint256 listingId) public view returns (Listing memory) {
        return listingsHandler.getListing(listingId);
    }

    /**
     * @dev Calculates the price of tokens based on the price in the listing
     * @param listingId Id of the listing, from which to get the price
     * @param tokenAmount Amount of tokens to calculate the price for
     */
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

    /**
     * @dev Computes the resulting status of an order confirmation based on the current status,
     * the role of the user interacting with the order, and the action of the
     * listing.
     * @param orderId Id of the order
     * @param sender Address of the user interacting with the order
     */
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

    /**
     * @dev Computes the resulting status of an order cancellation based on the current status,
     * the role of the user interacting with the order, and the action of the
     * listing.
     * @param orderId Id of the order
     * @param sender Address of the user interacting with the order
     */
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
