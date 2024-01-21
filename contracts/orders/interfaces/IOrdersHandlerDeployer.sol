// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IOrdersHandler} from "./IOrdersHandler.sol";

interface IOrdersHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        address ordersKeyStorageDeployer,
        uint256 initalId
    ) external returns (IOrdersHandler);
}
