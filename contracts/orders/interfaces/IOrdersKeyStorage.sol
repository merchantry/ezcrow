// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../../utils/structs.sol";
import {SortDirection, OrdersFilter} from "../../utils/enums.sol";

interface IOrdersKeyStorage {
    function initializeKeys(Order memory order, Listing memory listing) external;

    function updateKeys(Order memory order) external;

    function getListingOrderIds(uint256 listingId) external view returns (uint256[] memory);

    function getUserOrderIds(address user) external view returns (uint256[] memory);

    function sortAndFilterIds(
        uint256[] memory ids,
        OrdersFilter filter,
        SortDirection dir
    ) external view returns (uint256[] memory);
}
