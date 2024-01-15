// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IOrdersEventHandlerErrors {
    error NotOrdersHandler(address ordersHandler, address sender);

    error OrderAmountLessThanListingMinPerOrder(uint256 fiatAmount, uint256 minPricePerOrder);

    error OrderAmountGreaterThanListingMaxPerOrder(uint256 fiatAmount, uint256 maxPricePerOrder);

    error OrderAmountGreaterThanListingAvailableAmount(
        uint256 fiatAmount,
        uint256 availableTokenAmount
    );
}
