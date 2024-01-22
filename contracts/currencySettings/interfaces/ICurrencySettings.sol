// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface ICurrencySettings {
    function setDecimals(uint8 decimals) external;

    function decimals() external view returns (uint8);

    function symbol() external view returns (string memory);
}
