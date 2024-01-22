// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface ICurrencySettingsFactoryErrors {
    error CurrencySettingsAlreadyExists(string symbol);

    error CurrencySettingsDoesNotExist(string symbol);
}
