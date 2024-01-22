// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction} from "../../utils/enums.sol";

library ListingsFilterHandler {
    function getFilteredIds(
        mapping(uint256 => ListingAction) storage index,
        uint256[] memory idsArray,
        ListingAction action
    ) internal view returns (uint256[] memory) {
        uint256 count = idsArray.length;
        uint256[] memory filteredIdsArray = new uint256[](count);
        uint256 filteredCount = 0;

        for (uint256 i = 0; i < count; i++) {
            uint256 id = idsArray[i];
            if (index[id] == action) {
                filteredIdsArray[filteredCount] = id;
                filteredCount++;
            }
        }

        assembly {
            mstore(filteredIdsArray, filteredCount)
        }

        return filteredIdsArray;
    }
}
