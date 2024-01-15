// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingsHandler} from "./ListingsHandler.sol";
import {IListingsHandler} from "./interfaces/IListingsHandler.sol";

contract ListingsHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        uint256 initalId
    ) external returns (IListingsHandler) {
        return new ListingsHandler(owner, eventHandler, initalId);
    }
}
