// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing} from "../../utils/structs.sol";
import {ListingsSortBy, SortDirection, ListingsFilter, ListingAction} from "../../utils/enums.sol";

interface IListingsKeyStorage {
    function initializeKeys(Listing memory listing) external;

    function updateKeys(Listing memory listing) external;

    function getUserListingIds(address user) external view returns (uint256[] memory);

    function sortAndFilterIds(
        uint256[] memory ids,
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir
    ) external view returns (uint256[] memory);
}
