// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../../utils/structs.sol";
import {OrderStatus} from "../../utils/enums.sol";

interface IOrdersEventHandler {
    function getListing(uint256 listingId) external view returns (Listing memory);

    function onOrderAccepted(Order memory order) external;

    function onOrderRejected(Order memory order) external;

    function beforeOrderCreate(
        uint256 listingId,
        uint256 tokenAmount,
        address creator
    ) external view;

    function calculateOrderPrice(
        uint256 listingId,
        uint256 tokenAmount
    ) external view returns (uint256);

    function computeOrderConfirmationStatus(
        uint256 orderId,
        address sender
    ) external view returns (OrderStatus);

    function computeOrderCancellationStatus(
        uint256 orderId,
        address sender
    ) external view returns (OrderStatus);
}
