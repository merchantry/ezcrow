// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsHandler} from "./IListingsHandler.sol";

interface IListingsHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        address listingsKeyStorageDeployer,
        uint256 initalId
    ) external returns (IListingsHandler);
}
