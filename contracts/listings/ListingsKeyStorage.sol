// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {UserListingIds} from "./UserListingIds.sol";
import {ListingsPriceKey} from "./ListingsPriceKey.sol";
import {ListingsAvailableAmountKey} from "./ListingsAvailableAmountKey.sol";
import {ListingsMinPricePerOrderKey} from "./ListingsMinPricePerOrderKey.sol";
import {ListingsActionKey} from "./ListingsActionKey.sol";
import {Listing} from "../utils/structs.sol";
import {Sorting} from "../utils/libraries/Sorting.sol";
import {Filtering} from "../utils/libraries/Filtering.sol";
import {ListingsSortBy, SortDirection, ListingsFilter, ListingAction} from "../utils/enums.sol";

abstract contract ListingsKeyStorage is
    UserListingIds,
    ListingsPriceKey,
    ListingsAvailableAmountKey,
    ListingsMinPricePerOrderKey,
    ListingsActionKey
{
    using Sorting for mapping(uint256 => uint256);
    using Filtering for mapping(uint256 => ListingAction);

    error InvalidSortType();

    function initializeKeys(Listing memory listing) internal {
        addUserListingId(listing.creator, listing.id);
        addListingPriceKey(listing.id, listing.price);
        addListingAvailableAmountKey(listing.id, listing.availableTokenAmount);
        addListingMinPricePerOrderKey(listing.id, listing.minPricePerOrder);
        addListingActionKey(listing.id, listing.action);
    }

    function updateKeys(Listing memory listing) internal {
        addListingPriceKey(listing.id, listing.price);
        addListingAvailableAmountKey(listing.id, listing.availableTokenAmount);
        addListingMinPricePerOrderKey(listing.id, listing.minPricePerOrder);
    }

    function getSortedIds(
        uint256[] memory ids,
        ListingsSortBy sortType,
        SortDirection dir
    ) private view returns (uint256[] memory) {
        if (sortType == ListingsSortBy.Price) {
            return listingsPriceKeys.getSortedIndex(ids, dir);
        } else if (sortType == ListingsSortBy.AvailableAmount) {
            return listingsAvailableAmountKeys.getSortedIndex(ids, dir);
        } else if (sortType == ListingsSortBy.MinPricePerOrder) {
            return listingsMinPricePerOrderKeys.getSortedIndex(ids, dir);
        } else {
            revert InvalidSortType();
        }
    }

    function getFilteredIds(
        uint256[] memory ids,
        ListingsFilter filter
    ) private view returns (uint256[] memory) {
        if (filter == ListingsFilter.All) {
            return ids;
        } else if (filter == ListingsFilter.Buy) {
            return listingsActionKeys.getFilteredIndex(ids, ListingAction.Buy);
        } else if (filter == ListingsFilter.Sell) {
            return listingsActionKeys.getFilteredIndex(ids, ListingAction.Sell);
        } else {
            revert InvalidSortType();
        }
    }

    function sortAndFilterIds(
        uint256[] memory ids,
        ListingsFilter filter,
        ListingsSortBy sortType,
        SortDirection dir
    ) internal view returns (uint256[] memory) {
        uint256[] memory sortedIds = getSortedIds(ids, sortType, dir);
        return getFilteredIds(sortedIds, filter);
    }
}
