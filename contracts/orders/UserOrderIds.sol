// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract UserOrderIds {
    mapping(address => uint256[]) internal userOrderIds;

    function addUserOrderId(address user, uint256 orderId) internal {
        userOrderIds[user].push(orderId);
    }
}
