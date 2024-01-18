// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract ListingsPriceKey {
    mapping(uint256 => uint256) internal listingsPriceKeys;

    function addListingPriceKey(uint256 listingId, uint256 price) internal {
        listingsPriceKeys[listingId] = price;
    }
}
