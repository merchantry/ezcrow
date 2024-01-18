// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract OrderAmountKey {
    mapping(uint256 => uint256) internal ordersAmountKeys;

    function addOrderAmountKey(uint256 orderId, uint256 amount) internal {
        ordersAmountKeys[orderId] = amount;
    }
}
