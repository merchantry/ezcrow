// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction} from "../utils/enums.sol";
import {Listing} from "../utils/structs.sol";
import {CurrencyCalculator} from "../utils/libraries/CurrencyCalculator.sol";
import {Math} from "../utils/libraries/Math.sol";
import {ListingsFactory} from "./ListingsFactory.sol";
import {ListingsKeyStorage} from "./ListingsKeyStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IListingsHandlerErrors} from "./interfaces/IListingsHandlerErrors.sol";

abstract contract ListingsHandler is
    ListingsKeyStorage,
    ListingsFactory,
    IListingsHandlerErrors,
    Ownable
{
    /**
     * Events
     */
    event ListingCreated(Listing listing);

    event ListingUpdated(Listing listing);

    event ListingDeleted(uint256 id);

    /**
     * Modifiers
     */
    modifier validListingData(
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) {
        validateListingData(price, totalTokenAmount, minPricePerOrder, maxPricePerOrder);

        _;
    }

    modifier canBeUpdatedOrRemoved(uint256 id) {
        validateListingCanBeEdited(id);

        _;
    }

    modifier isOwnerOfListing(uint256 id, address user) {
        if (user != _getListing(id).creator) {
            revert UserIsNotListingCreator(id, user);
        }

        _;
    }

    /**
     * Virtual functions
     */
    function validateListingData(
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) internal view virtual;

    function validateListingCanBeEdited(uint256 id) internal view virtual;

    function onListingCreated(Listing memory listing) internal virtual;

    function onListingUpdated(uint256 previousAmount, Listing memory listing) internal virtual;

    function onListingDeleted(Listing memory listing) internal virtual;

    /**
     * Internal functions
     */
    function addListingAvailableAmount(
        uint256 listingId,
        uint256 amount
    ) internal notDeleted(listingId) {
        Listing storage listing = _getListing(listingId);

        unchecked {
            listing.availableTokenAmount += amount;
        }
    }

    function subtractListingAvailableAmount(
        uint256 listingId,
        uint256 amount
    ) internal notDeleted(listingId) {
        Listing storage listing = _getListing(listingId);

        unchecked {
            listing.availableTokenAmount -= amount;
        }
    }

    /**
     * External functions
     */
    function createListing(
        ListingAction action,
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder,
        address creator
    ) external onlyOwner validListingData(price, totalTokenAmount, minPricePerOrder, maxPricePerOrder) {
        Listing memory listing = _createListing(
            action,
            price,
            totalTokenAmount,
            minPricePerOrder,
            maxPricePerOrder,
            creator
        );

        initializeKeys(listing);
        emit ListingCreated(listing);
        onListingCreated(listing);
    }

    function updateListing(
        uint256 id,
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder,
        address sender
    )
        external
        onlyOwner
        notDeleted(id)
        canBeUpdatedOrRemoved(id)
        isOwnerOfListing(id, sender)
        validListingData(price, totalTokenAmount, minPricePerOrder, maxPricePerOrder)
    {
        Listing storage listing = _getListing(id);
        uint256 previousAmount = listing.totalTokenAmount;

        listing.price = price;
        listing.totalTokenAmount = totalTokenAmount;
        listing.minPricePerOrder = minPricePerOrder;
        listing.maxPricePerOrder = maxPricePerOrder;

        emit ListingUpdated(listing);
        onListingUpdated(previousAmount, listing);
    }

    function deleteListing(
        uint256 id,
        address sender
    ) external onlyOwner notDeleted(id) canBeUpdatedOrRemoved(id) isOwnerOfListing(id, sender) {
        Listing storage listing = _getListing(id);

        listing.isDeleted = true;

        emit ListingDeleted(id);
        onListingDeleted(listing);
    }

    /**
     * External view functions
     */
    function getUserListings(address user) external view returns (Listing[] memory) {
        return _getListingsFromIds(getUserListingIds(user));
    }
}
