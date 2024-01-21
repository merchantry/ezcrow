// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingsHandler} from "./ListingsHandler.sol";
import {IListingsHandler} from "./interfaces/IListingsHandler.sol";
import {IListingsHandlerDeployer} from "./interfaces/IListingsHandlerDeployer.sol";

contract ListingsHandlerDeployer is IListingsHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        address listingsKeyStorageDeployer,
        uint256 initalId
    ) external returns (IListingsHandler) {
        return new ListingsHandler(owner, eventHandler, listingsKeyStorageDeployer, initalId);
    }
}
