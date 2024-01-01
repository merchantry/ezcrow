// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "./listings/ListingsHandler.sol";
import "./orders/OrdersHandler.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {ListingAction, OrderStatus} from "./utils/enums.sol";
import {Order, OrderStatusTree} from "./utils/structs.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {CurrencyCalculator} from "./utils/libraries/CurrencyCalculator.sol";
import {OrderStatusHandler} from "./orders/libraries/OrderStatusHandler.sol";
import {TokenHandler} from "./TokenHandler.sol";
import {CurrencySettingsConsumer} from "./CurrencySettingsConsumer.sol";

contract FiatTokenPair is ListingsHandler, OrdersHandler, TokenHandler, CurrencySettingsConsumer {
    using OrderStatusHandler for OrderStatus[];
    using CurrencyCalculator for uint256;

    string public pairSymbol;

    constructor(
        address token,
        address currencySettings,
        string memory _pairSymbol,
        uint256 initialListingId,
        uint256 initialOrderId
    )
        TokenHandler(token)
        CurrencySettingsConsumer(currencySettings)
        ListingsFactory(initialListingId)
        OrdersFactory(initialOrderId)
        Ownable(_msgSender())
    {
        pairSymbol = _pairSymbol;
    }

    /**
     * Private functions
     */
    function calculateTotalTokenPrice(
        uint256 tokenAmount,
        uint256 pricePerToken
    ) private view returns (uint256) {
        uint256 minPrice = 1;
        uint8 currencyDecimals = getCurrencyDecimals();

        uint256 calculatedPrice = tokenAmount.calculatePrice(
            getDecimals(),
            pricePerToken,
            currencyDecimals
        );

        return Math.max(calculatedPrice, minPrice.withDecimals(currencyDecimals));
    }

    function listingHasActiveOrders(uint256 listingId) private view returns (bool) {
        Order[] memory orders = getListingOrders(listingId);

        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].statusHistory.getCurrentStatus() != OrderStatus.Cancelled) return true;
        }

        return false;
    }

    function getUserRole(uint256 orderId, address user) private view returns (UserRole) {
        Order memory order = _getOrder(orderId);
        if (user == order.creator) return UserRole.OrderCreator;

        Listing memory listing = _getListing(order.listingId);
        if (user == listing.creator) return UserRole.ListingCreator;

        revert UserIsNeitherListingNorOrderCreator(user);
    }

    /**
     * ListingsHandler overriding functions
     */
    function validateListingData(
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) internal view override(ListingsHandler) {
        if (minPricePerOrder == 0) {
            revert ListingMinPerOrderIsZero();
        }

        if (minPricePerOrder > maxPricePerOrder) {
            revert ListingMinPerOrderGreaterThanMaxPerOrder(minPricePerOrder, maxPricePerOrder);
        }

        uint256 totalPrice = calculateTotalTokenPrice(totalTokenAmount, price);

        if (maxPricePerOrder > totalPrice) {
            revert ListingMaxPerOrderGreaterThanTotalAmount(maxPricePerOrder, totalPrice);
        }
    }

    function validateListingCanBeEdited(uint256 listingId) internal view override(ListingsHandler) {
        if (listingHasActiveOrders(listingId)) {
            revert ListingCannotBeEditedOrRemoved(listingId);
        }
    }

    function onListingCreated(Listing memory listing) internal override(ListingsHandler) {
        if (listing.action != ListingAction.Sell) return;

        transferFromUser(listing.creator, listing.totalTokenAmount);
    }

    function onListingUpdated(
        uint256 previousAmount,
        Listing memory listing
    ) internal override(ListingsHandler) {
        if (listing.action != ListingAction.Sell) return;

        if (listing.totalTokenAmount > previousAmount) {
            transferFromUser(listing.creator, listing.totalTokenAmount - previousAmount);
        } else if (previousAmount > listing.totalTokenAmount) {
            transferToUser(listing.creator, previousAmount - listing.totalTokenAmount);
        }
    }

    function onListingDeleted(Listing memory listing) internal override(ListingsHandler) {
        if (listing.action != ListingAction.Sell) return;

        transferToUser(listing.creator, listing.totalTokenAmount);
    }

    /**
     * OrdersKeyStorage overriding functions
     */
    function getListingCreator(
        uint256 listingId
    ) internal view override(OrdersKeyStorage) returns (address) {
        Listing memory listing = _getListing(listingId);

        return listing.creator;
    }

    /**
     * OrdersHandler overriding functions
     */
    function calculateOrderPrice(
        uint256 listingId,
        uint256 tokenAmount
    ) internal view override(OrdersHandler) returns (uint256) {
        Listing memory listing = _getListing(listingId);

        return calculateTotalTokenPrice(tokenAmount, listing.price);
    }

    function validateOrderData(
        uint256 listingId,
        uint256 tokenAmount
    ) internal view override(OrdersHandler) {
        Listing memory listing = _getListing(listingId);

        uint256 fiatAmount = calculateOrderPrice(listingId, tokenAmount);
        uint256 minOrderAmount = Math.min(
            listing.minPricePerOrder,
            calculateOrderPrice(listingId, listing.availableTokenAmount)
        );

        if (fiatAmount < minOrderAmount) {
            revert OrderAmountLessThanListingMinPerOrder(fiatAmount, minOrderAmount);
        }

        if (listing.maxPricePerOrder < fiatAmount) {
            revert OrderAmountGreaterThanListingMaxPerOrder(fiatAmount, listing.maxPricePerOrder);
        }
    }

    function onOrderCreated(Order memory order) internal override(OrdersHandler) {}

    function onOrderAccepted(Order memory order) internal override(OrdersHandler) {
        OrderStatus status = order.statusHistory.getCurrentStatus();
        Listing memory listing = _getListing(order.listingId);

        if (status == OrderStatus.AssetsConfirmed) {
            if (listing.availableTokenAmount < order.tokenAmount) {
                revert OrderAmountGreaterThanListingAvailableAmount(
                    order.tokenAmount,
                    listing.availableTokenAmount
                );
            }

            subtractListingAvailableAmount(order.listingId, order.tokenAmount);
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

    function onOrderRejected(Order memory order) internal override(OrdersHandler) {
        if (order.statusHistory.getCurrentStatus() != OrderStatus.Cancelled) return;

        if (order.statusHistory.statusExists(OrderStatus.AssetsConfirmed)) {
            addListingAvailableAmount(order.listingId, order.tokenAmount);
        }

        Listing memory listing = _getListing(order.listingId);

        if (
            listing.action == ListingAction.Buy &&
            order.statusHistory.statusExists(OrderStatus.TokensDeposited)
        ) {
            transferToUser(order.creator, order.tokenAmount);
        }
    }

    function computeOrderConfirmationStatus(
        Order memory order,
        address sender
    ) internal view override(OrdersHandler) returns (OrderStatus) {
        return
            order.statusHistory.getNextStatus(
                getUserRole(order.id, sender),
                _getListing(order.listingId).action,
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
        Order memory order,
        address sender
    ) internal view override(OrdersHandler) returns (OrderStatus) {
        return
            order.statusHistory.getNextStatus(
                getUserRole(order.id, sender),
                _getListing(order.listingId).action,
                OrderStatusTree({
                    listingCreatorSellingStatuses: [OrderStatus.Cancelled, OrderStatus.InDispute],
                    listingCreatorBuyingStatuses: [OrderStatus.Cancelled, OrderStatus.Cancelled],
                    orderCreatorSellingStatuses: [OrderStatus.Cancelled, OrderStatus.InDispute],
                    orderCreatorBuyingStatuses: [OrderStatus.Cancelled]
                })
            );
    }
}
