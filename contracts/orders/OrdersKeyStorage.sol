// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingOrderIds} from "./ListingOrderIds.sol";
import {UserOrderIds} from "./UserOrderIds.sol";
import {Order} from "../utils/structs.sol";

abstract contract OrdersKeyStorage is ListingOrderIds, UserOrderIds {
    function initializeKeys(Order memory order, address listingCreator) internal {
        addListingOrderId(order.listingId, order.id);
        addUserOrderId(order.creator, order.id);
        addUserOrderId(listingCreator, order.id);
    }
}
