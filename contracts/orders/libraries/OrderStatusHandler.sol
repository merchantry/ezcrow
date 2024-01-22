// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {OrderStatus, UserRole, ListingAction} from "../../utils/enums.sol";
import {OrderStatusTree} from "../../utils/structs.sol";

library OrderStatusHandler {
    error OrderCannotBeInteractedWithNow();

    /**
     * @dev Returns the next status of an order depending on current
     * OrderStatus, interacting user's role, an ListingAction.
     * Chooses the correct status based on the OrderStatusTree data provided.
     * - `contracts/utils/structs.sol`
     */
    function getNextStatus(
        OrderStatus[] memory statusHistory,
        UserRole role,
        ListingAction action,
        OrderStatusTree memory orderStatusTree
    ) internal pure returns (OrderStatus) {
        OrderStatus status = getCurrentStatus(statusHistory);

        if (status == OrderStatus.Completed || status == OrderStatus.InDispute) {
            revert OrderCannotBeInteractedWithNow();
        }

        if (role == UserRole.ListingCreator) {
            if (action == ListingAction.Sell) {
                if (status == OrderStatus.RequestSent) {
                    return orderStatusTree.listingCreatorSellingStatuses[0];
                } else if (status == OrderStatus.PaymentSent) {
                    return orderStatusTree.listingCreatorSellingStatuses[1];
                }
            } else if (action == ListingAction.Buy) {
                if (status == OrderStatus.RequestSent) {
                    return orderStatusTree.listingCreatorBuyingStatuses[0];
                } else if (status == OrderStatus.TokensDeposited) {
                    return orderStatusTree.listingCreatorBuyingStatuses[1];
                }
            }
        } else if (role == UserRole.OrderCreator) {
            if (action == ListingAction.Buy) {
                if (status == OrderStatus.AssetsConfirmed) {
                    return orderStatusTree.orderCreatorSellingStatuses[0];
                } else if (status == OrderStatus.PaymentSent) {
                    return orderStatusTree.orderCreatorSellingStatuses[1];
                }
            } else if (action == ListingAction.Sell) {
                if (status == OrderStatus.AssetsConfirmed) {
                    return orderStatusTree.orderCreatorBuyingStatuses[0];
                }
            }
        }

        revert OrderCannotBeInteractedWithNow();
    }

    function getCurrentStatus(
        OrderStatus[] memory statusHistory
    ) internal pure returns (OrderStatus) {
        return statusHistory[statusHistory.length - 1];
    }

    function statusExists(
        OrderStatus[] memory statusHistory,
        OrderStatus status
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < statusHistory.length; i++) {
            if (statusHistory[i] == status) {
                return true;
            }
        }

        return false;
    }
}
