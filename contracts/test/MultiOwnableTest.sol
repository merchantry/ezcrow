// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {MultiOwnable} from "../utils/MultiOwnable.sol";

contract MultiOwnableTest is MultiOwnable {
    constructor() MultiOwnable(_msgSender()) {}

    function ownerOnlyFunction() external onlyOwner {}

    function freeFunction() external {}
}
