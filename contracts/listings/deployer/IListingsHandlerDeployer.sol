// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsHandler} from "../interfaces/IListingsHandler.sol";

interface IListingsHandlerDeployer {
    function deploy(
        address owner,
        address eventHandler,
        uint256 initalId
    ) external returns (IListingsHandler);
}
