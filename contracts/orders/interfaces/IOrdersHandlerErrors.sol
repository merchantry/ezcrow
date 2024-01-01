// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IOrdersHandlerErrors {
    error OrderAmountLessThanListingMinPerOrder(uint256 fiatAmount, uint256 minPricePerOrder);

    error OrderAmountGreaterThanListingMaxPerOrder(uint256 fiatAmount, uint256 maxPricePerOrder);

    error UserIsNeitherListingNorOrderCreator(address user);

    error OrderIsNotInDispute(uint256 orderId);

    error OrderAmountGreaterThanListingAvailableAmount(uint256 fiatAmount, uint256 availableTokenAmount);
}
