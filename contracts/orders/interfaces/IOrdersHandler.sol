// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Order} from "../../utils/structs.sol";

interface IOrdersHandler {
    function createOrder(uint256 listingId, uint256 tokenAmount, address creator) external;

    function acceptOrder(uint256 id, address sender) external;

    function rejectOrder(uint256 id, address sender) external;

    function acceptDispute(uint256 id, address sender) external;

    function rejectDispute(uint256 id, address sender) external;

    function getOrder(uint256 id) external view returns (Order memory);

    function getOrders(uint256 maxOrders) external view returns (Order[] memory);

    function getListingOrders(
        uint256 listingId,
        uint256 maxOrders
    ) external view returns (Order[] memory);

    function getUserOrders(address user, uint256 maxOrders) external view returns (Order[] memory);
}
