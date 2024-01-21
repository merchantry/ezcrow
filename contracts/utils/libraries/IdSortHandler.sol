// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {SortDirection} from "../enums.sol";

library IdSortHandler {
    function getSortedIds(
        mapping(uint256 => uint256) storage index,
        uint256[] memory ids,
        SortDirection direction
    ) internal view returns (uint256[] memory) {
        uint256 count = ids.length;

        if (direction == SortDirection.Desc) {
            quickSortDesc(ids, index, int(0), int(count - 1));
        } else if (direction == SortDirection.Asc) {
            quickSortAsc(ids, index, int(0), int(count - 1));
        }

        return ids;
    }

    function quickSortDesc(
        uint256[] memory arr,
        mapping(uint256 => uint256) storage index,
        int left,
        int right
    ) private view {
        int i = left;
        int j = right;
        if (i == j) return;
        uint256 pivotIndex = arr[getMiddle(left, right)];
        uint256 pivotValue = index[pivotIndex];
        while (i <= j) {
            while (index[arr[uint256(i)]] > pivotValue) i++;
            while (pivotValue > index[arr[uint256(j)]]) j--;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSortDesc(arr, index, left, j);
        if (i < right) quickSortDesc(arr, index, i, right);
    }

    function quickSortAsc(
        uint256[] memory arr,
        mapping(uint256 => uint256) storage index,
        int left,
        int right
    ) private view {
        int i = left;
        int j = right;
        if (i == j) return;
        uint256 pivotIndex = arr[getMiddle(left, right)];
        uint256 pivotValue = index[pivotIndex];
        while (i <= j) {
            while (index[arr[uint256(i)]] < pivotValue) i++;
            while (pivotValue < index[arr[uint256(j)]]) j--;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSortAsc(arr, index, left, j);
        if (i < right) quickSortAsc(arr, index, i, right);
    }

    function getMiddle(int left, int right) private pure returns (uint256) {
        return uint256(left + (right - left) / 2);
    }
}
