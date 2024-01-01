// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IOrdersFactoryErrors {
    error OrderIsCancelled(uint256 orderId);

    error OrderDoesNotExist(uint256 orderId);
}
