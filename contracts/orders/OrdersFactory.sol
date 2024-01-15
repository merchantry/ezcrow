// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Order} from "../utils/structs.sol";
import {AutoIncrementingId} from "../utils/AutoIncrementingId.sol";
import {OrderStatus} from "../utils/enums.sol";
import {IOrdersFactoryErrors} from "./interfaces/IOrdersFactoryErrors.sol";

contract OrdersFactory is IOrdersFactoryErrors {
    mapping(uint256 => Order) private orders;
    AutoIncrementingId private orderId;

    constructor(uint256 initialId) {
        orderId = new AutoIncrementingId(initialId);
    }

    /**
     * Internal functions
     */
    function _createOrder(
        uint256 fiatAmount,
        uint256 tokenAmount,
        uint256 listingId,
        address creator
    ) internal returns (Order storage) {
        uint256 id = orderId.getNext();
        OrderStatus[] memory statusHistory = new OrderStatus[](1);
        statusHistory[0] = OrderStatus.RequestSent;

        orders[id] = Order(id, fiatAmount, tokenAmount, listingId, statusHistory, creator);

        return orders[id];
    }

    function _getOrder(uint256 id) internal view returns (Order storage) {
        if (!orderId.exists(id)) {
            revert OrderDoesNotExist(id);
        }

        return orders[id];
    }

    function _getOrders() internal view returns (Order[] memory) {
        Order[] memory _orders = new Order[](orderId.getCount());
        uint256 currentId = orderId.getCurrent();
        uint256 initialId = orderId.getInitial();

        for (uint256 i = initialId; i < currentId; i++) {
            _orders[i - initialId] = orders[i];
        }

        return _orders;
    }

    function _getOrdersFromIds(uint256[] memory ids) internal view returns (Order[] memory) {
        Order[] memory _orders = new Order[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            _orders[i] = _getOrder(ids[i]);
        }

        return _orders;
    }
}
