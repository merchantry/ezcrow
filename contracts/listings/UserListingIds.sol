// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract UserListingIds {
    mapping(address => uint256[]) internal userListingIds;

    function addUserListingId(address user, uint256 listingId) internal {
        userListingIds[user].push(listingId);
    }
}
