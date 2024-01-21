// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract ListingOrderIds {
    mapping(uint256 => uint256[]) internal listingOrderIds;

    function addListingOrderId(uint256 listingId, uint256 orderId) internal {
        listingOrderIds[listingId].push(orderId);
    }
}
