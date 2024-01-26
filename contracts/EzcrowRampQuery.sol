// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IFiatTokenPairHandler} from "./fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {Listing, Order} from "./utils/structs.sol";

contract EzcrowRampQuery {
    IFiatTokenPairHandler private fiatTokenPairHandler;

    constructor(address _fiatTokenPairHandler) {
        fiatTokenPairHandler = IFiatTokenPairHandler(_fiatTokenPairHandler);
    }

    /**
     * External view functions
     */
    function getListing(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId
    ) external view returns (Listing memory) {
        return
            fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getListing(
                listingId
            );
    }

    function getListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        return
            fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getListings(
                maxListings
            );
    }

    function getUserListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        return
            fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getUserListings(
                user,
                maxListings
            );
    }

    function getOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external view returns (Order memory) {
        return fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getOrder(orderId);
    }

    function getOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 maxOrders
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getOrders(maxOrders);
    }

    function getUserOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user,
        uint256 maxOrders
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getUserOrders(
                user,
                maxOrders
            );
    }

    function getListingOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId,
        uint256 maxOrders
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getListingOrders(
                listingId,
                maxOrders
            );
    }
}
