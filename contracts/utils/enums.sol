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

enum ListingsSortBy {
    Price,
    AvailableAmount,
    MinPricePerOrder
}

enum SortDirection {
    Desc,
    Asc
}

enum ListingsFilter {
    All,
    Buy,
    Sell
}

enum OrdersFilter {
    All,
    RequestSent,
    AssetsConfirmed,
    TokensDeposited,
    PaymentSent,
    Completed,
    InDispute,
    Cancelled
}
