// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {OrderStatus} from "../utils/enums.sol";

abstract contract OrdersStatusKey {
    mapping(uint256 => OrderStatus) internal ordersStatusKeys;

    function addOrdersStatusKey(uint256 orderId, OrderStatus status) internal {
        ordersStatusKeys[orderId] = status;
    }
}
