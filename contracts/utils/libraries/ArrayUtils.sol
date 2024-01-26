// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Math} from "./Math.sol";

library ArrayUtils {
    function slice(
        uint256[] memory arr,
        uint256 offset,
        uint256 limit
    ) internal pure returns (uint256[] memory) {
        uint256 count = Math.min(limit, arr.length >= offset ? arr.length - offset : 0);
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = arr[offset + i];
        }

        return result;
    }

    function range(uint256 start, uint256 end) internal pure returns (uint256[] memory) {
        uint256[] memory result = new uint256[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = i;
        }

        return result;
    }

    function sliceFromEnd(
        uint256[] memory arr,
        uint256 count
    ) internal pure returns (uint256[] memory) {
        uint256 length = arr.length;
        uint256 resultCount = Math.min(count, length);
        uint256[] memory result = new uint256[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = arr[length - resultCount + i];
        }

        return result;
    }
}
