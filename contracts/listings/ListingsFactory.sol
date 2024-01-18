// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction} from "../utils/enums.sol";
import {Listing} from "../utils/structs.sol";
import {AutoIncrementingId} from "../utils/AutoIncrementingId.sol";
import {IListingsFactoryErrors} from "./interfaces/IListingsFactoryErrors.sol";

abstract contract ListingsFactory is IListingsFactoryErrors {
    mapping(uint256 => Listing) private listings;
    AutoIncrementingId internal listingId;

    /**
     * Modifiers
     */
    modifier notDeleted(uint256 id) {
        if (listings[id].isDeleted) {
            revert ListingIsDeleted(id);
        }

        _;
    }

    constructor(uint256 initialId) {
        listingId = new AutoIncrementingId(initialId);
    }

    /**
     * Internal functions
     */
    function _createListing(
        ListingAction action,
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder,
        address creator
    ) internal returns (Listing storage) {
        uint256 id = listingId.getNext();

        listings[id] = Listing(
            id,
            action,
            price,
            totalTokenAmount,
            totalTokenAmount,
            minPricePerOrder,
            maxPricePerOrder,
            creator,
            false
        );

        return listings[id];
    }

    function _getListing(uint256 id) internal view returns (Listing storage) {
        if (!listingId.exists(id)) {
            revert ListingDoesNotExist(id);
        }

        return listings[id];
    }

    function _getListings() internal view returns (Listing[] memory) {
        Listing[] memory _listings = new Listing[](listingId.getCount());
        uint256 currentId = listingId.getCurrent();
        uint256 initialId = listingId.getInitial();

        for (uint256 i = initialId; i < currentId; i++) {
            _listings[i - initialId] = listings[i];
        }

        return _listings;
    }

    function _getListingsFromIds(uint256[] memory ids) internal view returns (Listing[] memory) {
        Listing[] memory _listings = new Listing[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            _listings[i] = _getListing(ids[i]);
        }

        return _listings;
    }
}
