// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction} from "../utils/enums.sol";

abstract contract ListingsActionKey {
    mapping(uint256 => ListingAction) internal listingsActionKeys;

    function addListingActionKey(uint256 listingId, ListingAction action) internal {
        listingsActionKeys[listingId] = action;
    }
}
