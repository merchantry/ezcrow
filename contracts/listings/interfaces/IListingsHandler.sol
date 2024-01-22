// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing} from "../../utils/structs.sol";
import {ListingAction, SortDirection, ListingsFilter, ListingsSortBy} from "../../utils/enums.sol";

interface IListingsHandler {
    function createListing(
        ListingAction action,
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder,
        address creator
    ) external;

    function updateListing(
        uint256 id,
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder,
        address sender
    ) external;

    function deleteListing(uint256 id, address sender) external;

    function addListingAvailableAmount(uint256 listingId, uint256 amount) external;

    function subtractListingAvailableAmount(uint256 listingId, uint256 amount) external;

    function getListing(uint256 id) external view returns (Listing memory);

    function getListings() external view returns (Listing[] memory);

    function getUserListings(address user) external view returns (Listing[] memory);

    function getSortedListings(
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory);

    function getSortedUserListings(
        address user,
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory);
}
