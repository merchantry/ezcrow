// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {UserListingIds} from "./UserListingIds.sol";
import {Listing} from "../utils/structs.sol";

abstract contract ListingsKeyStorage is UserListingIds {
    function initializeKeys(Listing memory listing) internal {
        addUserListingId(listing.creator, listing.id);
    }
}
