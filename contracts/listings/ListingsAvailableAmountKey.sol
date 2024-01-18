// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract ListingsAvailableAmountKey {
    mapping(uint256 => uint256) internal listingsAvailableAmountKeys;

    function addListingAvailableAmountKey(uint256 listingId, uint256 availableAmount) internal {
        listingsAvailableAmountKeys[listingId] = availableAmount;
    }
}
