// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing} from "../../utils/structs.sol";

interface IListingsKeyStorage {
    function initializeKeys(Listing memory listing) external;

    function getUserListingIds(address user) external view returns (uint256[] memory);
}
