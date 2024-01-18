// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract ListingsMinPricePerOrderKey {
    mapping(uint256 => uint256) internal listingsMinPricePerOrderKeys;

    function addListingMinPricePerOrderKey(uint256 listingId, uint256 minPricePerOrder) internal {
        listingsMinPricePerOrderKeys[listingId] = minPricePerOrder;
    }
}
