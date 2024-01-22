// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {CurrencySettings} from "./CurrencySettings.sol";
import {ICurrencySettingsFactoryErrors} from "./interfaces/ICurrencySettingsFactoryErrors.sol";

abstract contract CurrencySettingsFactory is ICurrencySettingsFactoryErrors {
    mapping(bytes32 => address) private currencySettings;
    bytes32[] private currencySettingsKeys;

    function getCurrencyKey(string memory symbol) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("currencySettings", symbol));
    }

    function createCurrencySettings(string memory symbol, uint8 decimals) internal {
        bytes32 key = getCurrencyKey(symbol);
        if (currencySettings[key] != address(0)) {
            revert CurrencySettingsAlreadyExists(symbol);
        }

        CurrencySettings settings = new CurrencySettings(symbol, decimals);

        currencySettings[key] = address(settings);
        currencySettingsKeys.push(key);
    }

    function getCurrencySettingsAddress(string memory symbol) public view returns (address) {
        bytes32 key = getCurrencyKey(symbol);
        address settings = currencySettings[key];

        if (settings == address(0)) {
            revert CurrencySettingsDoesNotExist(symbol);
        }

        return settings;
    }

    function getAllCurrencySettingsAdrresses() public view returns (address[] memory) {
        address[] memory settings = new address[](currencySettingsKeys.length);

        for (uint256 i = 0; i < currencySettingsKeys.length; i++) {
            settings[i] = currencySettings[currencySettingsKeys[i]];
        }

        return settings;
    }
}
