// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {FiatTokenPair} from "./fiatTokenPair/FiatTokenPair.sol";
import {FiatTokenPairHandler} from "./fiatTokenPair/FiatTokenPairHandler.sol";
import {CurrencySettingsHandler} from "./currencySettings/CurrencySettingsHandler.sol";
import {TokenFactory} from "./token/TokenFactory.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ListingAction} from "./utils/structs.sol";
import {WhitelistedUsersDatabaseHandler} from "./whitelistedUsersDatabase/WhitelistedUsersDatabaseHandler.sol";
import {Strings} from "./utils/libraries/Strings.sol";
import {IListingsHandler} from "./listings/interfaces/IListingsHandler.sol";
import {ICurrencySettings} from "./currencySettings/interfaces/ICurrencySettings.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {WhitelistedUsersDatabase} from "./whitelistedUsersDatabase/WhitelistedUsersDatabase.sol";
import {Listing, Order} from "./utils/structs.sol";

contract EzcrowRamp is
    FiatTokenPairHandler,
    CurrencySettingsHandler,
    TokenFactory,
    WhitelistedUsersDatabaseHandler
{
    using Strings for string;

    error InvalidListingIdsLength(uint256 requiredLength);

    error InvalidOrderIdsLength(uint256 requiredLength);

    constructor(
        address fiatTokenPairDeployer,
        address listingsHandlerDeployer,
        address ordersHandlerDeployer
    ) FiatTokenPairHandler(fiatTokenPairDeployer, listingsHandlerDeployer, ordersHandlerDeployer) {}

    /**
     * External functions
     */
    function addToken(
        address token,
        uint256[] memory initialListingIds,
        uint256[] memory initialOrderIds
    ) external onlyOwner {
        addTokenAddress(token);

        address[] memory currencySettings = getAllCurrencySettingsAdrresses();

        if (currencySettings.length != initialListingIds.length) {
            revert InvalidListingIdsLength(currencySettings.length);
        }

        if (currencySettings.length != initialOrderIds.length) {
            revert InvalidOrderIdsLength(currencySettings.length);
        }

        for (uint256 i = 0; i < currencySettings.length; i++) {
            createFiatTokenPair(
                token,
                currencySettings[i],
                initialListingIds[i],
                initialOrderIds[i]
            );
        }
    }

    function addCurrencySettings(
        string memory symbol,
        uint8 decimals,
        uint256[] memory initialListingIds,
        uint256[] memory initialOrderIds
    ) external onlyOwner {
        createCurrencySettings(symbol, decimals);

        address currencySettinsAddress = getCurrencySettingsAddress(symbol);
        address[] memory tokens = getAllTokenAddresses();

        if (tokens.length != initialListingIds.length) {
            revert InvalidListingIdsLength(tokens.length);
        }

        if (tokens.length != initialOrderIds.length) {
            revert InvalidOrderIdsLength(tokens.length);
        }

        for (uint256 i = 0; i < tokens.length; i++) {
            createFiatTokenPair(
                tokens[i],
                currencySettinsAddress,
                initialListingIds[i],
                initialOrderIds[i]
            );
        }
    }

    function createListing(
        string memory tokenSymbol,
        string memory currencySymbol,
        ListingAction action,
        uint256 price,
        uint256 tokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) external onlyWLUsers {
        getListingsHandler(tokenSymbol, currencySymbol).createListing(
            action,
            price,
            tokenAmount,
            minPricePerOrder,
            maxPricePerOrder,
            _msgSender()
        );
    }

    function updateListing(
        string memory listingTokenSymbol,
        string memory listingCurrencySymbol,
        uint256 listingId,
        string memory tokenSymbol,
        string memory currencySymbol,
        ListingAction action,
        uint256 price,
        uint256 tokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) external {
        IListingsHandler currentListingsHandler = getListingsHandler(
            listingTokenSymbol,
            listingCurrencySymbol
        );
        Listing memory listing = currentListingsHandler.getListing(listingId);

        IListingsHandler listingsHandler = getListingsHandler(tokenSymbol, currencySymbol);

        if (
            address(currentListingsHandler) != address(listingsHandler) || listing.action != action
        ) {
            currentListingsHandler.deleteListing(listingId, _msgSender());

            listingsHandler.createListing(
                action,
                price,
                tokenAmount,
                minPricePerOrder,
                maxPricePerOrder,
                _msgSender()
            );
        } else {
            listingsHandler.updateListing(
                listingId,
                price,
                tokenAmount,
                minPricePerOrder,
                maxPricePerOrder,
                _msgSender()
            );
        }
    }

    function deleteListing(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId
    ) external {
        getListingsHandler(tokenSymbol, currencySymbol).deleteListing(listingId, _msgSender());
    }

    function createOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId,
        uint256 tokenAmount
    ) external {
        getOrdersHandler(tokenSymbol, currencySymbol).createOrder(
            listingId,
            tokenAmount,
            _msgSender()
        );
    }

    function acceptOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external {
        getOrdersHandler(tokenSymbol, currencySymbol).acceptOrder(orderId, _msgSender());
    }

    function rejectOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external {
        getOrdersHandler(tokenSymbol, currencySymbol).rejectOrder(orderId, _msgSender());
    }

    function acceptDispute(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external onlyOwner {
        getOrdersHandler(tokenSymbol, currencySymbol).acceptDispute(orderId, _msgSender());
    }

    function rejectDispute(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external onlyOwner {
        getOrdersHandler(tokenSymbol, currencySymbol).rejectDispute(orderId, _msgSender());
    }

    /**
     * External view functions
     */
    function getListing(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId
    ) external view returns (Listing memory) {
        return getListingsHandler(tokenSymbol, currencySymbol).getListing(listingId);
    }

    function getListings(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (Listing[] memory) {
        return getListingsHandler(tokenSymbol, currencySymbol).getListings();
    }

    function getUserListings(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user
    ) external view returns (Listing[] memory) {
        return getListingsHandler(tokenSymbol, currencySymbol).getUserListings(user);
    }

    function getOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external view returns (Order memory) {
        return getOrdersHandler(tokenSymbol, currencySymbol).getOrder(orderId);
    }

    function getOrders(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (Order[] memory) {
        return getOrdersHandler(tokenSymbol, currencySymbol).getOrders();
    }

    function getUserOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        address user
    ) external view returns (Order[] memory) {
        return getOrdersHandler(tokenSymbol, currencySymbol).getUserOrders(user);
    }

    function getListingOrders(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId
    ) external view returns (Order[] memory) {
        return getOrdersHandler(tokenSymbol, currencySymbol).getListingOrders(listingId);
    }

    function getTokenSymbols() external view returns (string[] memory) {
        address[] memory tokenAddresses = getAllTokenAddresses();
        string[] memory tokenSymbols = new string[](tokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            tokenSymbols[i] = IERC20Metadata(tokenAddresses[i]).symbol();
        }

        return tokenSymbols;
    }

    function getCurrencySymbols() external view returns (string[] memory) {
        address[] memory currencySettingsAddresses = getAllCurrencySettingsAdrresses();
        string[] memory currencySymbols = new string[](currencySettingsAddresses.length);

        for (uint256 i = 0; i < currencySettingsAddresses.length; i++) {
            currencySymbols[i] = ICurrencySettings(currencySettingsAddresses[i]).symbol();
        }

        return currencySymbols;
    }
}
