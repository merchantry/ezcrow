// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ICurrencySettings} from "./interfaces/ICurrencySettings.sol";

abstract contract CurrencySettingsConsumer {
    address private currencySettings;

    constructor(address _currencySettings) {
        currencySettings = _currencySettings;
    }

    function getCurrencyDecimals() internal view returns (uint8) {
        return ICurrencySettings(currencySettings).decimals();
    }
}
