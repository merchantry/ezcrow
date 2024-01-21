// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsKeyStorage} from "./IListingsKeyStorage.sol";

interface IListingsKeyStorageDeployer {
    function deploy(address owner) external returns (IListingsKeyStorage);
}
