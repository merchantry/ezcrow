// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IListingsHandlerErrors {
    error ListingMinPerOrderIsZero();

    error ListingCannotBeEditedOrRemoved(uint256 listingId);

    error ListingMinPerOrderGreaterThanMaxPerOrder(uint256 minPricePerOrder, uint256 maxPricePerOrder);

    error ListingMaxPerOrderGreaterThanTotalAmount(uint256 maxPricePerOrder, uint256 totalTokenAmount);

    error UserIsNotListingCreator(uint256 listingId, address user);
}
