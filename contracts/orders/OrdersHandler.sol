// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing, Order} from "../utils/structs.sol";
import {OrderStatus, UserRole, SortDirection, OrdersFilter} from "../utils/enums.sol";
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
            creator
        );

        ordersKeyStorage.initializeKeys(order, listing);
        emit OrderCreated(order);
    }

    function acceptOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = eventHandler.computeOrderConfirmationStatus(id, sender);

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderAccepted(order);
        ordersKeyStorage.updateKeys(order);
    }

    function rejectOrder(uint256 id, address sender) external onlyOwner notCancelled(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = eventHandler.computeOrderCancellationStatus(id, sender);

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderRejected(order);
        ordersKeyStorage.updateKeys(order);
    }

    function acceptDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Cancelled;

        emit OrderRejected(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderRejected(order);
        ordersKeyStorage.updateKeys(order);
    }

    function rejectDispute(uint256 id, address sender) external onlyOwner orderInDispute(id) {
        Order storage order = _getOrder(id);
        OrderStatus currentStatus = order.statusHistory.getCurrentStatus();
        OrderStatus nextStatus = OrderStatus.Completed;

        emit OrderAccepted(id, sender, currentStatus, nextStatus);

        order.statusHistory.push(nextStatus);
        eventHandler.onOrderAccepted(order);
        ordersKeyStorage.updateKeys(order);
    }

    /**
     * External view functions
     */
    function getOrder(uint256 id) external view returns (Order memory) {
        return _getOrder(id);
    }

    function getOrders() external view returns (Order[] memory) {
        return _getOrders();
    }

    function getListingOrders(uint256 listingId) public view returns (Order[] memory) {
        return _getOrdersFromIds(ordersKeyStorage.getListingOrderIds(listingId));
    }

    function getUserOrders(address user) external view returns (Order[] memory) {
        return _getOrdersFromIds(ordersKeyStorage.getUserOrderIds(user));
    }

    function getSortedUserOrders(
        address user,
        OrdersFilter filter,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxOrders
    ) external view returns (Order[] memory) {
        uint256[] memory ids = ordersKeyStorage.getUserOrderIds(user).sliceFromEnd(maxOrders);

        return
            _getOrdersFromIds(
                ordersKeyStorage.sortAndFilterIds(ids, filter, dir).slice(offset, count)
            );
    }
}
