// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IListingsEventHandlerErrors {
    error NotListingsHandler(address listingsHandler, address sender);

    error ListingMinPerOrderIsZero();

    error ListingCannotBeEditedOrRemoved(uint256 listingId);

    error ListingMinPerOrderGreaterThanMaxPerOrder(
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    );

    error ListingMaxPerOrderGreaterThanTotalPrice(
        uint256 maxPricePerOrder,
        uint256 totalTokenAmount
    );
}
