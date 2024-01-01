// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

library Math {
    function abs(int256 x) internal pure returns (uint128) {
        return uint128(uint(x >= 0 ? x : -x));
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Multiplies n by 10^exponent. Exponent can be negative, in which case it will divide n
     * by 10^|exponent|.
     */
    function multiplyByTenPow(uint256 n, int256 exponent) internal pure returns (uint256) {
        uint128 absoluteExponent = abs(exponent);
        if (exponent < 0) {
            return n / 10 ** absoluteExponent;
        }

        return n * 10 ** absoluteExponent;
    }
}
