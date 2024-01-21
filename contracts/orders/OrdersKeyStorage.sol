// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingOrderIds} from "./ListingOrderIds.sol";
import {UserOrderIds} from "./UserOrderIds.sol";
import {OrdersAmountKey} from "./OrdersAmountKey.sol";
import {OrdersStatusKey} from "./OrdersStatusKey.sol";
import {Listing, Order} from "../utils/structs.sol";
import {SortDirection} from "../utils/enums.sol";
import {OrderStatusHandler} from "./libraries/OrderStatusHandler.sol";
import {IdSortHandler} from "../utils/libraries/IdSortHandler.sol";
import {OrdersFilterHandler} from "./libraries/OrdersFilterHandler.sol";
import {Ownable} from "../utils/Ownable.sol";
import {IOrdersKeyStorage} from "./interfaces/IOrdersKeyStorage.sol";
import {OrderStatus, OrdersFilter} from "../utils/enums.sol";

contract OrdersKeyStorage is
    IOrdersKeyStorage,
    ListingOrderIds,
    UserOrderIds,
    OrdersAmountKey,
    OrdersStatusKey,
    Ownable
{
    using IdSortHandler for mapping(uint256 => uint256);
    using OrderStatusHandler for OrderStatus[];
    using OrdersFilterHandler for mapping(uint256 => OrderStatus);

    constructor(address owner) Ownable(owner) {}

    /**
     * Private functions
     */
    function getFilteredIds(
        uint256[] memory ids,
        OrdersFilter filter
    ) private view returns (uint256[] memory) {
        if (filter == OrdersFilter.RequestSent) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.RequestSent);
        } else if (filter == OrdersFilter.AssetsConfirmed) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.AssetsConfirmed);
        } else if (filter == OrdersFilter.TokensDeposited) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.TokensDeposited);
        } else if (filter == OrdersFilter.PaymentSent) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.PaymentSent);
        } else if (filter == OrdersFilter.Completed) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.Completed);
        } else if (filter == OrdersFilter.InDispute) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.InDispute);
        } else if (filter == OrdersFilter.Cancelled) {
            return ordersStatusKeys.getFilteredIds(ids, OrderStatus.Cancelled);
        }

        return ids;
    }

    /**
     * External functions
     */
    function initializeKeys(Order memory order, Listing memory listing) external onlyOwner {
        addListingOrderId(order.listingId, order.id);
        addUserOrderId(order.creator, order.id);
        addUserOrderId(listing.creator, order.id);
        addOrdersAmountKey(order.id, order.tokenAmount);
        addOrdersStatusKey(order.id, order.statusHistory.getCurrentStatus());
    }

    function updateKeys(Order memory order) external onlyOwner {
        addOrdersStatusKey(order.id, order.statusHistory.getCurrentStatus());
    }

    /**
     * External view functions
     */
    function getListingOrderIds(uint256 listingId) external view returns (uint256[] memory) {
        return listingOrderIds[listingId];
    }

    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return userOrderIds[user];
    }

    function getSortedIds(
        uint256[] memory ids,
        SortDirection dir
    ) private view returns (uint256[] memory) {
        return ordersAmountKeys.getSortedIds(ids, dir);
    }

    function sortAndFilterIds(
        uint256[] memory ids,
        OrdersFilter filter,
        SortDirection dir
    ) external view returns (uint256[] memory) {
        return getFilteredIds(getSortedIds(ids, dir), filter);
    }
}
