// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IListingsFactoryErrors {
    error ListingIsDeleted(uint256 listingId);

    error ListingDoesNotExist(uint256 listingId);
}
