// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingOrderIds} from "./ListingOrderIds.sol";
import {UserOrderIds} from "./UserOrderIds.sol";
import {OrderAmountKey} from "./OrderAmountKey.sol";
import {Listing, Order} from "../utils/structs.sol";
import {SortDirection} from "../utils/enums.sol";
import {Sorting} from "../utils/libraries/Sorting.sol";

abstract contract OrdersKeyStorage is ListingOrderIds, UserOrderIds, OrderAmountKey {
    using Sorting for mapping(uint256 => uint256);

    function initializeKeys(Order memory order, Listing memory listing) internal {
        addListingOrderId(order.listingId, order.id);
        addUserOrderId(order.creator, order.id);
        addUserOrderId(listing.creator, order.id);
        addOrderAmountKey(order.id, order.tokenAmount);
    }

    function sortIds(
        uint256[] memory ids,
        SortDirection dir
    ) internal view returns (uint256[] memory) {
        return ordersAmountKeys.getSortedIndex(ids, dir);
    }
}
