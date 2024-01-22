// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsKeyStorage} from "./interfaces/IListingsKeyStorage.sol";
import {UserListingIds} from "./UserListingIds.sol";
import {ListingsPriceKey} from "./ListingsPriceKey.sol";
import {ListingsAvailableAmountKey} from "./ListingsAvailableAmountKey.sol";
import {ListingsMinPricePerOrderKey} from "./ListingsMinPricePerOrderKey.sol";
import {ListingsActionKey} from "./ListingsActionKey.sol";
import {Ownable} from "../utils/Ownable.sol";
import {Listing} from "../utils/structs.sol";
import {IdSortHandler} from "../utils/libraries/IdSortHandler.sol";
import {ListingsFilterHandler} from "./libraries/ListingsFilterHandler.sol";
import {ListingsSortBy, SortDirection, ListingsFilter, ListingAction} from "../utils/enums.sol";

contract ListingsKeyStorage is
    IListingsKeyStorage,
    UserListingIds,
    ListingsPriceKey,
    ListingsAvailableAmountKey,
    ListingsMinPricePerOrderKey,
    ListingsActionKey,
    Ownable
{
    using IdSortHandler for mapping(uint256 => uint256);
    using ListingsFilterHandler for mapping(uint256 => ListingAction);

    error InvalidSortBy();

    constructor(address owner) Ownable(owner) {}

    /**
     * Private functions
     */
    function getSortedIds(
        uint256[] memory ids,
        ListingsSortBy sortBy,
        SortDirection dir
    ) private view returns (uint256[] memory) {
        if (sortBy == ListingsSortBy.Price) {
            return listingsPriceKeys.getSortedIds(ids, dir);
        } else if (sortBy == ListingsSortBy.AvailableAmount) {
            return listingsAvailableAmountKeys.getSortedIds(ids, dir);
        } else if (sortBy == ListingsSortBy.MinPricePerOrder) {
            return listingsMinPricePerOrderKeys.getSortedIds(ids, dir);
        } else {
            revert InvalidSortBy();
        }
    }

    function getFilteredIds(
        uint256[] memory ids,
        ListingsFilter filter
    ) private view returns (uint256[] memory) {
        if (filter == ListingsFilter.Buy) {
            return listingsActionKeys.getFilteredIds(ids, ListingAction.Buy);
        } else if (filter == ListingsFilter.Sell) {
            return listingsActionKeys.getFilteredIds(ids, ListingAction.Sell);
        }

        return ids;
    }

    /**
     * External functions
     */
    function initializeKeys(Listing memory listing) external onlyOwner {
        addUserListingId(listing.creator, listing.id);
        addListingPriceKey(listing.id, listing.price);
        addListingAvailableAmountKey(listing.id, listing.availableTokenAmount);
        addListingMinPricePerOrderKey(listing.id, listing.minPricePerOrder);
        addListingActionKey(listing.id, listing.action);
    }

    function updateKeys(Listing memory listing) external onlyOwner {
        addListingPriceKey(listing.id, listing.price);
        addListingAvailableAmountKey(listing.id, listing.availableTokenAmount);
        addListingMinPricePerOrderKey(listing.id, listing.minPricePerOrder);
    }

    /**
     * External view functions
     */
    function getUserListingIds(address user) external view returns (uint256[] memory) {
        return userListingIds[user];
    }

    function sortAndFilterIds(
        uint256[] memory ids,
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir
    ) external view returns (uint256[] memory) {
        return getFilteredIds(getSortedIds(ids, sortBy, dir), filter);
    }
}
