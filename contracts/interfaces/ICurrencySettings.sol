// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface ICurrencySettings {
    function getDecimals() external view returns (uint8);
}
