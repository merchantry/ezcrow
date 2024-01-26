// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingOrderIds} from "./ListingOrderIds.sol";
import {UserOrderIds} from "./UserOrderIds.sol";
import {OrdersAmountKey} from "./OrdersAmountKey.sol";
import {OrdersStatusKey} from "./OrdersStatusKey.sol";
import {Listing, Order} from "../utils/structs.sol";
import {Ownable} from "../utils/Ownable.sol";
import {IOrdersKeyStorage} from "./interfaces/IOrdersKeyStorage.sol";
import {OrderStatus} from "../utils/enums.sol";

contract OrdersKeyStorage is
    IOrdersKeyStorage,
    ListingOrderIds,
    UserOrderIds,
    OrdersAmountKey,
    OrdersStatusKey,
    Ownable
{
    constructor(address owner) Ownable(owner) {}

    /**
     * External functions
     */
    function initializeKeys(Order memory order, Listing memory listing) external onlyOwner {
        addListingOrderId(order.listingId, order.id);
        addUserOrderId(order.creator, order.id);
        addUserOrderId(listing.creator, order.id);
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
}
