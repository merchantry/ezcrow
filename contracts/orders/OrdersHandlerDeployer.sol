// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {OrdersHandler} from "./OrdersHandler.sol";
import {IOrdersHandler} from "./interfaces/IOrdersHandler.sol";
import {IOrdersHandlerDeployer} from "./interfaces/IOrdersHandlerDeployer.sol";

contract OrdersHandlerDeployer is IOrdersHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        address ordersKeyStorageDeployer,
        uint256 initalId
    ) external returns (IOrdersHandler) {
        return new OrdersHandler(owner, eventHandler, ordersKeyStorageDeployer, initalId);
    }
}
