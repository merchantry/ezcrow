// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../../utils/structs.sol";

interface IOrdersKeyStorage {
    function initializeKeys(Order memory order, Listing memory listing) external;

    function getListingOrderIds(uint256 listingId) external view returns (uint256[] memory);

    function getUserOrderIds(address user) external view returns (uint256[] memory);
}
