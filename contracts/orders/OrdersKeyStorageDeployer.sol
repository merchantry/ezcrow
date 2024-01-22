// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {OrdersKeyStorage} from "./OrdersKeyStorage.sol";
import {IOrdersKeyStorage} from "./interfaces/IOrdersKeyStorage.sol";
import {IOrdersKeyStorageDeployer} from "./interfaces/IOrdersKeyStorageDeployer.sol";

contract OrdersKeyStorageDeployer is IOrdersKeyStorageDeployer {
    function deploy(address owner) external returns (IOrdersKeyStorage) {
        return new OrdersKeyStorage(owner);
    }
}
