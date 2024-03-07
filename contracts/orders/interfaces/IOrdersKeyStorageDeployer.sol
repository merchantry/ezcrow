// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IOrdersKeyStorage} from "../interfaces/IOrdersKeyStorage.sol";

interface IOrdersKeyStorageDeployer {
    function deploy(address owner) external returns (IOrdersKeyStorage);
}
