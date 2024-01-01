// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract UserListingIds {
    mapping(address => uint256[]) private _userListingIds;

    function addUserListingId(address user, uint256 listingId) internal {
        _userListingIds[user].push(listingId);
    }

    function getUserListingIds(address user) internal view returns (uint256[] memory) {
        return _userListingIds[user];
    }
}
