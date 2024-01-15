// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {TransformUintToInt} from "./TransformUintToInt.sol";
import {Math} from "./Math.sol";
import {FixedPoint} from "../structs.sol";

library FixedPointMath {
    using TransformUintToInt for uint8;

    function mul(FixedPoint memory a, FixedPoint memory b) internal pure returns (uint256) {
        return Math.multiplyByTenPow(a.value * b.value, b.decimals.toInt() - a.decimals.toInt());
    }
}
