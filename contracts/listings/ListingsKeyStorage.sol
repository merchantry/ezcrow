// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsKeyStorage} from "./interfaces/IListingsKeyStorage.sol";
import {UserListingIds} from "./UserListingIds.sol";
import {Ownable} from "../utils/Ownable.sol";
import {Listing} from "../utils/structs.sol";
import {ListingAction} from "../utils/enums.sol";

contract ListingsKeyStorage is IListingsKeyStorage, UserListingIds, Ownable {
    constructor(address owner) Ownable(owner) {}

    /**
     * External functions
     */
    function initializeKeys(Listing memory listing) external onlyOwner {
        addUserListingId(listing.creator, listing.id);
    }

    /**
     * External view functions
     */
    function getUserListingIds(address user) external view returns (uint256[] memory) {
        return userListingIds[user];
    }
}
