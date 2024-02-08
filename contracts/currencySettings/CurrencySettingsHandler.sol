// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {CurrencySettingsFactory} from "./CurrencySettingsFactory.sol";
import {ICurrencySettings} from "./interfaces/ICurrencySettings.sol";

abstract contract CurrencySettingsHandler is CurrencySettingsFactory {
    function _setCurrencyDecimals(string memory symbol, uint8 decimals) internal {
        ICurrencySettings currencySettings = ICurrencySettings(getCurrencySettingsAddress(symbol));

        currencySettings.setDecimals(decimals);
    }

    function getCurrencyDecimals(string memory symbol) external view returns (uint8) {
        ICurrencySettings currencySettings = ICurrencySettings(getCurrencySettingsAddress(symbol));

        return currencySettings.decimals();
    }
}
