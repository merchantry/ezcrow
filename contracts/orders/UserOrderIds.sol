// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract UserOrderIds {
    mapping(address => uint256[]) private _userOrderIds;

    function addUserOrderId(address user, uint256 orderId) internal {
        _userOrderIds[user].push(orderId);
    }

    function getUserOrderIds(address user) internal view returns (uint256[] memory) {
        return _userOrderIds[user];
    }
}
