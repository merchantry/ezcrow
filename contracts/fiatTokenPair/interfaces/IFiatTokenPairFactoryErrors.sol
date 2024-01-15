// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IFiatTokenPairFactoryErrors {
    error FiatTokenPairAlreadyExists(address token, address currencySettings);

    error FiatTokenPairDoesNotExist(string tokenSymbol, string currencySymbol);
}
