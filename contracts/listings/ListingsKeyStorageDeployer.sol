// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingsKeyStorage} from "./ListingsKeyStorage.sol";
import {IListingsKeyStorage} from "./interfaces/IListingsKeyStorage.sol";
import {IListingsKeyStorageDeployer} from "./interfaces/IListingsKeyStorageDeployer.sol";

contract ListingsKeyStorageDeployer is IListingsKeyStorageDeployer {
    function deploy(address owner) external returns (IListingsKeyStorage) {
        return new ListingsKeyStorage(owner);
    }
}
