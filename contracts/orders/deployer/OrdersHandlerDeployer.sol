// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {OrdersHandler} from "../OrdersHandler.sol";
import {IOrdersHandler} from "../interfaces/IOrdersHandler.sol";

contract OrdersHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        uint256 initalId
    ) external returns (IOrdersHandler) {
        return new OrdersHandler(owner, eventHandler, initalId);
    }
}
