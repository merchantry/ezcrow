// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../utils/structs.sol";
import {OrderStatus, UserRole} from "../utils/enums.sol";
import {OrdersFactory} from "./OrdersFactory.sol";
import {OrdersKeyStorage} from "./OrdersKeyStorage.sol";
import {IOrdersKeyStorage} from "./interfaces/IOrdersKeyStorage.sol";
import {IOrdersKeyStorageDeployer} from "./interfaces/IOrdersKeyStorageDeployer.sol";
import {Ownable} from "../utils/Ownable.sol";
import {OrderStatusHandler} from "./libraries/OrderStatusHandler.sol";
import {ArrayUtils} from "../utils/libraries/ArrayUtils.sol";
import {IOrdersHandler} from "./interfaces/IOrdersHandler.sol";
import {IOrdersEventHandler} from "./interfaces/IOrdersEventHandler.sol";
import {IOrdersHandlerErrors} from "./interfaces/IOrdersHandlerErrors.sol";

contract OrdersHandler is OrdersFactory, IOrdersHandler, IOrdersHandlerErrors, Ownable {
    using ArrayUtils for uint256[];
    using OrderStatusHandler for OrderStatus[];

    IOrdersEventHandler private eventHandler;

    IOrdersKeyStorage private ordersKeyStorage;

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
        eventHandler.beforeOrderCreate(listingId, tokenAmount);

        _;
    }

    modifier orderInDispute(uint256 id) {
        if (_getOrder(id).statusHistory.getCurrentStatus() != OrderStatus.InDispute) {
            revert OrderIsNotInDispute(id);
        }

        _;
    }

    constructor(
        address owner,
        address _eventHandler,
        address ordersKeyStorageDeployer,
        uint256 initialId
    ) Ownable(owner) OrdersFactory(initialId) {
        eventHandler = IOrdersEventHandler(_eventHandler);
        ordersKeyStorage = IOrdersKeyStorage(
            IOrdersKeyStorageDeployer(ordersKeyStorageDeployer).deploy(address(this))
        );
    }

    /**
     * External functions
     */

    /**
     * @dev Only callable by the owner contract. Creates a new order and emits an OrderCreated event.
     * Sends the order data to the event handler to validate. The event handler will revert if data
     * is invalid. Initializes the order keys for easy sorting and filtering.
     *
     * @param listingId Id of the listing the order is for
     * @param tokenAmount Amount of tokens to be bought or sold
     * @param creator Address of the order creator
     */
    function createOrder(
        uint256 listingId,
        uint256 tokenAmount,
        address creator
    ) external onlyOwner validOrderData(listingId, tokenAmount) {
        Listing memory listing = eventHandler.getListing(listingId);

        Order memory order = _createOrder(
            eventHandler.calculateOrderPrice(listingId, tokenAmount),
            tokenAmount,
            listingId,
            listing.action,
            creator
        );

        ordersKeyStorage.initializeKeys(order, listing);
        emit OrderCreated(order);
    }

    /**
     * @dev Only callable by the owner contract. Accepts the order and emits an OrderAccepted event.
     * The event handler will compute the next status based on the current status and the sender's
     * role. The event handler will revert if the order cannot be accepted. Updates the order status
     * history and updates the order keys for easy sorting and filtering.
     *
     * @param id Id of the order to be accepted
     * @param sender Address of the user interacting with the order
     */
    function acceptOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = eventHandler.computeOrderConfirmationStatus(id, sender);

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderAccepted(order);
    }

    /**
     * @dev Only callable by the owner contract. Rejects the order and emits an OrderRejected event.
     * The event handler will compute the next status based on the current status and the sender's
     * role. The event handler will revert if the order cannot be rejected. Updates the order status
     * history and updates the order keys for easy sorting and filtering.
     *
     * @param id Id of the order to be rejected
     * @param sender Address of the user interacting with the order
     */
    function rejectOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = eventHandler.computeOrderCancellationStatus(id, sender);

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderRejected(order);
    }

    /**
     * @dev Only callable by the owner contract. Cancels the order and emits an OrderRejected event.
     * Reverts if the order is not in dispute.
     *
     * @param id Id of the order to be cancelled
     * @param sender Address of the user interacting with the order
     */
    function acceptDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Cancelled;

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderRejected(order);
    }

    /**
     * @dev Only callable by the owner contract. Cempletes the order and emits an OrderAccepted event.
     * Reverts if the order is not in dispute.
     *
     * @param id Id of the order to be rejected
     * @param sender Address of the user interacting with the order
     */
    function rejectDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Completed;

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderAccepted(order);
    }

    /**
     * External view functions
     */
    function getOrder(uint256 id) external view returns (Order memory) {
        return _getOrder(id);
    }

    /**
     * @dev Returns up to maxOrders
     */
    function getOrders(uint256 maxOrders) external view returns (Order[] memory) {
        return
            _getOrdersFromIds(
                ArrayUtils.range(orderId.getInitial(), orderId.getCurrent()).sliceFromEnd(maxOrders)
            );
    }

    /**
     * @dev Returns all orders for a listing
     */
    function getListingOrders(
        uint256 listingId,
        uint256 maxOrders
    ) public view returns (Order[] memory) {
        return
            _getOrdersFromIds(
                ordersKeyStorage.getListingOrderIds(listingId).sliceFromEnd(maxOrders)
            );
    }

    /**
     * @dev Returns all user orders. If the user is the listing creator, returns all orders for
     * the listing.
     */
    function getUserOrders(address user, uint256 maxOrders) external view returns (Order[] memory) {
        return _getOrdersFromIds(ordersKeyStorage.getUserOrderIds(user).sliceFromEnd(maxOrders));
    }
}
