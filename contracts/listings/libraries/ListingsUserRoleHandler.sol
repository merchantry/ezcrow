// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../../utils/structs.sol";
import {UserRole} from "../../utils/enums.sol";

library ListingsUserRoleHandler {
    error UserIsNeitherListingNorOrderCreator(address user);

    function getUserRole(
        address user,
        Order memory order,
        Listing memory listing
    ) internal pure returns (UserRole) {
        if (user == listing.creator) return UserRole.ListingCreator;
        if (user == order.creator) return UserRole.OrderCreator;

        revert UserIsNeitherListingNorOrderCreator(user);
    }
}
