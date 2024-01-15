// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";
import {ICurrencySettings} from "./interfaces/ICurrencySettings.sol";

contract CurrencySettings is ICurrencySettings, Ownable {
    string private symbol_;
    uint8 private decimals_;

    constructor(string memory _symbol, uint8 _decimals) Ownable(_msgSender()) {
        symbol_ = _symbol;
        decimals_ = _decimals;
    }

    function setDecimals(uint8 _decimals) external onlyOwner {
        decimals_ = _decimals;
    }

    function decimals() external view override returns (uint8) {
        return decimals_;
    }

    function symbol() external view override returns (string memory) {
        return symbol_;
    }
}
