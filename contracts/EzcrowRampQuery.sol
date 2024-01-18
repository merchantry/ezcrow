// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IFiatTokenPairHandler} from "./fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {Listing, Order} from "./utils/structs.sol";
import {SortDirection, ListingsFilter, ListingsSortBy} from "./utils/enums.sol";

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
        string memory currencySymbol
    ) external view returns (Listing[] memory) {
        return fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getListings();
    }

    function getUserListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user
    ) external view returns (Listing[] memory) {
        return
            fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getUserListings(
                user
            );
    }

    function getSortedListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        ListingsFilter filter,
        ListingsSortBy sortType,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        return
            fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).getSortedListings(
                filter,
                sortType,
                dir,
                offset,
                count,
                maxListings
            );
    }

    function getSortedUserListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user,
        ListingsFilter filter,
        ListingsSortBy sortType,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxListings
    ) external view returns (Listing[] memory) {
        return
            fiatTokenPairHandler
                .getListingsHandler(tokenSymbol, currencySymbol)
                .getSortedUserListings(user, filter, sortType, dir, offset, count, maxListings);
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
        string memory currencySymbol
    ) external view returns (Order[] memory) {
        return fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getOrders();
    }

    function getUserOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getUserOrders(user);
    }

    function getListingOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getListingOrders(
                listingId
            );
    }

    function getSortedUserOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user,
        SortDirection dir,
        uint256 offset,
        uint256 count,
        uint256 maxOrders
    ) external view returns (Order[] memory) {
        return
            fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).getSortedUserOrders(
                user,
                dir,
                offset,
                count,
                maxOrders
            );
    }
}
