// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Order} from "../utils/structs.sol";
import {OrderStatus} from "../utils/enums.sol";
import {OrdersFactory} from "./OrdersFactory.sol";
import {OrdersKeyStorage} from "./OrdersKeyStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IOrdersHandlerErrors} from "./interfaces/IOrdersHandlerErrors.sol";
import {UserRole} from "../utils/enums.sol";
import {OrderStatusHandler} from "./libraries/OrderStatusHandler.sol";

abstract contract OrdersHandler is OrdersFactory, OrdersKeyStorage, IOrdersHandlerErrors, Ownable {
    using OrderStatusHandler for OrderStatus[];

    /**
     * Events
     */
    event OrderCreated(Order order);

    event OrderAccepted(uint256 id, address sender, OrderStatus previous, OrderStatus current);

    event OrderRejected(uint256 id, address sender, OrderStatus previous, OrderStatus current);

    /**
     * Modifiers
     */
    modifier notCancelled(uint256 id) {
        if (_getOrder(id).statusHistory.getCurrentStatus() == OrderStatus.Cancelled) {
            revert OrderIsCancelled(id);
        }
        _;
    }
    modifier validOrderData(uint256 listingId, uint256 tokenAmount) {
        validateOrderData(listingId, tokenAmount);

        _;
    }

    modifier orderInDispute(uint256 id) {
        if (_getOrder(id).statusHistory.getCurrentStatus() != OrderStatus.InDispute) {
            revert OrderIsNotInDispute(id);
        }

        _;
    }

    /**
     * Virtual functions
     */
    function validateOrderData(uint256 listingId, uint256 tokenAmount) internal view virtual;

    function onOrderCreated(Order memory order) internal virtual;

    function onOrderAccepted(Order memory order) internal virtual;

    function onOrderRejected(Order memory order) internal virtual;

    function calculateOrderPrice(
        uint256 listingId,
        uint256 tokenAmount
    ) internal view virtual returns (uint256);

    function computeOrderConfirmationStatus(
        Order memory order,
        address sender
    ) internal view virtual returns (OrderStatus);

    function computeOrderCancellationStatus(
        Order memory order,
        address sender
    ) internal view virtual returns (OrderStatus);

    /**
     * External functions
     */
    function createOrder(
        uint256 listingId,
        uint256 tokenAmount,
        address creator
    ) external onlyOwner validOrderData(listingId, tokenAmount) {
        Order memory order = _createOrder(
            calculateOrderPrice(listingId, tokenAmount),
            tokenAmount,
            listingId,
            creator
        );

        initializeKeys(order);
        emit OrderCreated(order);
        onOrderCreated(order);
    }

    function acceptOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = computeOrderConfirmationStatus(order, sender);

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        onOrderAccepted(order);
    }

    function rejectOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = computeOrderCancellationStatus(order, sender);

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        onOrderRejected(order);
    }

    function acceptDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Cancelled;

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        onOrderRejected(order);
    }

    function rejectDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Completed;

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        onOrderAccepted(order);
    }

    /**
     * External view functions
     */
    function getListingOrders(uint256 listingId) public view returns (Order[] memory) {
        return _getOrdersFromIds(getListingOrderIds(listingId));
    }

    function getUserOrders(address user) external view returns (Order[] memory) {
        return _getOrdersFromIds(getUserOrderIds(user));
    }
}
