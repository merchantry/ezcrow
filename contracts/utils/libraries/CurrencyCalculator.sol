// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {TransformUintToInt} from "./TransformUintToInt.sol";
import {Math} from "./Math.sol";

library CurrencyCalculator {
    using TransformUintToInt for uint8;

    function calculatePrice(
        uint256 amountOfTokens,
        uint8 decimals,
        uint256 pricePerToken,
        uint8 priceDecimals
    ) internal pure returns (uint256) {
        return
            Math.multiplyByTenPow(
                amountOfTokens * pricePerToken,
                priceDecimals.toInt() - decimals.toInt()
            );
    }

    function withDecimals(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        return Math.multiplyByTenPow(amount, decimals.toInt());
    }
}
