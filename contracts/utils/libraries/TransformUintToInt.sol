// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

library TransformUintToInt {
    function toInt(uint8 x) internal pure returns (int16) {
        return int16(uint16(x));
    }
}
