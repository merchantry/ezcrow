// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CurrencySettings is Ownable {
    uint8 private decimals;

    constructor(uint8 _decimals) Ownable(_msgSender()) {
        decimals = _decimals;
    }

    function setDecimals(uint8 _decimals) external onlyOwner {
        decimals = _decimals;
    }

    function getDecimals() external view returns (uint8) {
        return decimals;
    }
}
