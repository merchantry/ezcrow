// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

enum ListingAction {
    Buy,
    Sell
}

enum OrderStatus {
    RequestSent,
    AssetsConfirmed,
    TokensDeposited,
    PaymentSent,
    Completed,
    InDispute,
    Cancelled
}

enum UserRole {
    ListingCreator,
    OrderCreator
}
