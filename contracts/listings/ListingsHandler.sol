// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction} from "../utils/enums.sol";
import {Listing} from "../utils/structs.sol";
import {FixedPointMath} from "../utils/libraries/FixedPointMath.sol";
import {Math} from "../utils/libraries/Math.sol";
import {ListingsFactory} from "./ListingsFactory.sol";
import {ListingsKeyStorage} from "./ListingsKeyStorage.sol";
import {Ownable} from "../utils/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IListingsHandlerErrors} from "./interfaces/IListingsHandlerErrors.sol";
import {IListingsHandler} from "./interfaces/IListingsHandler.sol";
import {IListingsEventHandler} from "./interfaces/IListingsEventHandler.sol";

contract ListingsHandler is
    ListingsKeyStorage,
    ListingsFactory,
    IListingsHandler,
    IListingsHandlerErrors,
    Ownable
{
    IListingsEventHandler private eventHandler;

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
        eventHandler.beforeListingCreate(
            price,
            totalTokenAmount,
            minPricePerOrder,
            maxPricePerOrder
        );

        _;
    }

    modifier canBeUpdatedOrRemoved(uint256 id) {
        eventHandler.beforeListingEdit(id);

        _;
    }

    modifier onlyOnEvent() {
        if (_msgSender() != address(eventHandler)) {
            revert CallerIsNotEventHandler(_msgSender(), address(eventHandler));
        }

        _;
    }

    modifier isOwnerOfListing(uint256 id, address user) {
        if (user != _getListing(id).creator) {
            revert UserIsNotListingCreator(id, user);
        }

        _;
    }

    constructor(
        address owner,
        address _eventHandler,
        uint256 initalId
    ) Ownable(owner) ListingsFactory(initalId) {
        eventHandler = IListingsEventHandler(_eventHandler);
    }

    /**
     * On Event functions
     */
    function addListingAvailableAmount(
        uint256 listingId,
        uint256 amount
    ) external onlyOnEvent notDeleted(listingId) {
        Listing storage listing = _getListing(listingId);

        unchecked {
            listing.availableTokenAmount += amount;
        }
    }

    function subtractListingAvailableAmount(
        uint256 listingId,
        uint256 amount
    ) external onlyOnEvent notDeleted(listingId) {
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
    )
        external
        onlyOwner
        validListingData(price, totalTokenAmount, minPricePerOrder, maxPricePerOrder)
    {
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
        eventHandler.onListingCreated(listing);
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
        listing.availableTokenAmount = totalTokenAmount;
        listing.minPricePerOrder = minPricePerOrder;
        listing.maxPricePerOrder = maxPricePerOrder;

        emit ListingUpdated(listing);
        eventHandler.onListingUpdated(previousAmount, listing);
    }

    function deleteListing(
        uint256 id,
        address sender
    ) external onlyOwner notDeleted(id) canBeUpdatedOrRemoved(id) isOwnerOfListing(id, sender) {
        Listing storage listing = _getListing(id);

        listing.isDeleted = true;

        emit ListingDeleted(id);
        eventHandler.onListingDeleted(listing);
    }

    /**
     * External view functions
     */
    function getListing(uint256 id) external view returns (Listing memory) {
        return _getListing(id);
    }

    function getListings() external view returns (Listing[] memory) {
        return _getListings();
    }

    function getUserListings(address user) external view returns (Listing[] memory) {
        return _getListingsFromIds(getUserListingIds(user));
    }
}
