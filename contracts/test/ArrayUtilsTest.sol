// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ArrayUtils} from "../utils/libraries/ArrayUtils.sol";

contract ArrayUtilsTest {
    using ArrayUtils for uint256[];

    function slice(
        uint256[] memory arr,
        uint256 offset,
        uint256 limit
    ) public pure returns (uint256[] memory) {
        return arr.slice(offset, limit);
    }

    function range(uint256 start, uint256 end) public pure returns (uint256[] memory) {
        return ArrayUtils.range(start, end);
    }

    function intersection(
        uint256[] memory arr1,
        uint256[] memory arr2
    ) public pure returns (uint256[] memory) {
        return arr1.getIntersection(arr2);
    }

    function sliceFromEnd(
        uint256[] memory arr,
        uint256 count
    ) public pure returns (uint256[] memory) {
        return arr.sliceFromEnd(count);
    }

    function contains(uint256[] memory arr, uint256 value) public pure returns (bool) {
        return arr.contains(value);
    }
}
