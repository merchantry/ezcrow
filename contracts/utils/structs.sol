// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ListingAction, OrderStatus} from "./enums.sol";

/**
 * @dev Listing struct
 * @param id Listing id
 * @param action Whether the listing creator is looking to buy or sell tokens
 * @param price Price per token in fiat currency
 * @param totalTokenAmount Total amount of tokens to be bought or sold
 * @param availableTokenAmount Amount of tokens available to be bought or sold
 * @param minPricePerOrder Minimum amount of fiat currency that can be accepted per order
 * @param maxPricePerOrder Maximum amount of fiat currency that can be accepted per order
 * @param creator Address of the listing creator
 * @param isDeleted Whether the listing has been deleted
 */
struct Listing {
    uint256 id;
    ListingAction action;
    uint256 price;
    uint256 totalTokenAmount;
    uint256 availableTokenAmount;
    uint256 minPricePerOrder;
    uint256 maxPricePerOrder;
    address creator;
    bool isDeleted;
}

/**
 * @dev Order struct
 * @param id Order id
 * @param fiatAmount Amount of fiat currency to be paid
 * @param tokenAmount Amount of tokens to be bought or sold
 * @param listingId Id of the listing the order is for
 * @param listingAction Copy of the listing action, mostly used for easier access
 * @param statusHistory Order status history
 * @param creator Address of the order creator
 */
struct Order {
    uint256 id;
    uint256 fiatAmount;
    uint256 tokenAmount;
    uint256 listingId;
    ListingAction listingAction;
    OrderStatus[] statusHistory;
    address creator;
}

/**
 * @dev OrderStatusTree is used as a structure to layout order status
 * outcomes depending on current OrderStatus, interacting user's role,
 * and ListingAction. It's mainly used in the library:
 * - `contracts/orders/libraries/OrderStatusHandler.sol`
 *
 * There are 2 types of listings:
 * - ListingAction.Sell where the listing creator is selling tokens
 * - ListingAction.Buy where the listing creator is buying tokens
 *
 * In ListingAction.Sell:
 *
 * listingCreatorSellingStatuses[i] | Current OrderStatus | orderCreatorBuyingStatuses[i]
 * ---------------------------------|---------------------|-----------------------
 * i = 0                            |     RequestSent     |
 *                                  |   AssetsConfirmed   | i = 0
 * i = 1                            |     PaymentSent     |
 *
 *
 * In ListingAction.Buy:
 *
 * listingCreatorBuyingStatuses[i]  | Current OrderStatus | orderCreatorSellingStatuses[i]
 * ---------------------------------|---------------------|-----------------------
 * i = 0                            |     RequestSent     |
 *                                  |   AssetsConfirmed   | i = 0
 * i = 1                            |   TokensDeposited   |
 *                                  |     PaymentSent     | i = 1
 *
 */
struct OrderStatusTree {
    OrderStatus[2] listingCreatorSellingStatuses;
    OrderStatus[2] listingCreatorBuyingStatuses;
    OrderStatus[2] orderCreatorSellingStatuses;
    OrderStatus[1] orderCreatorBuyingStatuses;
}

/**
 * @dev FixedPoint used to represent a fixed point number
 * for easier calculations.
 */
struct FixedPoint {
    uint256 value;
    uint8 decimals;
}
