// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction, ListingsSortBy, SortDirection, ListingsFilter} from "../utils/enums.sol";
import {Listing} from "../utils/structs.sol";
import {FixedPointMath} from "../utils/libraries/FixedPointMath.sol";
import {IdSortHandler} from "../utils/libraries/IdSortHandler.sol";
import {Math} from "../utils/libraries/Math.sol";
import {ArrayUtils} from "../utils/libraries/ArrayUtils.sol";
import {ListingsFactory} from "./ListingsFactory.sol";
import {ListingsKeyStorage} from "./ListingsKeyStorage.sol";
import {Ownable} from "../utils/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IListingsHandlerErrors} from "./interfaces/IListingsHandlerErrors.sol";
import {IListingsHandler} from "./interfaces/IListingsHandler.sol";
import {IListingsEventHandler} from "./interfaces/IListingsEventHandler.sol";
import {IListingsKeyStorage} from "./interfaces/IListingsKeyStorage.sol";
import {IListingsKeyStorageDeployer} from "./interfaces/IListingsKeyStorageDeployer.sol";

contract ListingsHandler is ListingsFactory, IListingsHandler, IListingsHandlerErrors, Ownable {
    using ArrayUtils for uint256[];

    IListingsEventHandler private eventHandler;

    IListingsKeyStorage private listingsKeyStorage;

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

    modifier canBeUpdated(uint256 id) {
        eventHandler.beforeListingUpdate(id);

        _;
    }

    modifier canBeDeleted(uint256 id) {
        eventHandler.beforeListingDelete(id);

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
        address listingsKeyStorageDeployer,
        uint256 initalId
    ) Ownable(owner) ListingsFactory(initalId) {
        eventHandler = IListingsEventHandler(_eventHandler);
        listingsKeyStorage = IListingsKeyStorage(
            IListingsKeyStorageDeployer(listingsKeyStorageDeployer).deploy(address(this))
        );
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

        listingsKeyStorage.updateKeys(listing);
    }

    function subtractListingAvailableAmount(
        uint256 listingId,
        uint256 amount
    ) external onlyOnEvent notDeleted(listingId) {
        Listing storage listing = _getListing(listingId);

        unchecked {
            listing.availableTokenAmount -= amount;
        }

        listingsKeyStorage.updateKeys(listing);
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

        listingsKeyStorage.initializeKeys(listing);
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
        canBeUpdated(id)
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

        listingsKeyStorage.updateKeys(listing);
        emit ListingUpdated(listing);
        eventHandler.onListingUpdated(previousAmount, listing);
    }

    function deleteListing(
        uint256 id,
        address sender
    ) external onlyOwner notDeleted(id) canBeDeleted(id) isOwnerOfListing(id, sender) {
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
        return _getListingsFromIds(listingsKeyStorage.getUserListingIds(user));
    }

    function getSortedListings(
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        uint256[] memory ids = ArrayUtils
            .range(listingId.getInitial(), listingId.getCurrent())
            .sliceFromEnd(maxListings);

        return
            _getListingsFromIds(
                listingsKeyStorage.sortAndFilterIds(ids, filter, sortBy, dir).slice(offset, count)
            );
    }

    function getSortedUserListings(
        address user,
        ListingsFilter filter,
        ListingsSortBy sortBy,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        uint256[] memory ids = listingsKeyStorage.getUserListingIds(user).sliceFromEnd(maxListings);

        return
            _getListingsFromIds(
                listingsKeyStorage.sortAndFilterIds(ids, filter, sortBy, dir).slice(offset, count)
            );
    }
}
