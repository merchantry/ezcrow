// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IFiatTokenPairHandler} from "./fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {CurrencySettingsHandler} from "./currencySettings/CurrencySettingsHandler.sol";
import {TokenFactory} from "./token/TokenFactory.sol";
import {WhitelistedUsersDatabaseHandler} from "./whitelistedUsersDatabase/WhitelistedUsersDatabaseHandler.sol";
import {IListingsHandler} from "./listings/interfaces/IListingsHandler.sol";
import {ICurrencySettings} from "./currencySettings/interfaces/ICurrencySettings.sol";
import {OrderActionSignable} from "./OrderActionSignable.sol";

import {ListingAction} from "./utils/structs.sol";
import {Strings} from "./utils/libraries/Strings.sol";
import {Listing, Order} from "./utils/structs.sol";
import {SortDirection, ListingsFilter, ListingsSortBy} from "./utils/enums.sol";

contract EzcrowRamp is
    CurrencySettingsHandler,
    TokenFactory,
    WhitelistedUsersDatabaseHandler,
    OrderActionSignable
{
    using Strings for string;

    IFiatTokenPairHandler private fiatTokenPairHandler;

    constructor() OrderActionSignable("EzcrowRamp") {}

    /**
     * External functions
     */
    function setFiatTokenPairHandler(address fiatTokenPairHandlerAddress) external onlyOwner {
        fiatTokenPairHandler = IFiatTokenPairHandler(fiatTokenPairHandlerAddress);
    }

    function addToken(address token) external onlyOwner {
        addTokenAddress(token);
    }

    function addCurrencySettings(string memory symbol, uint8 decimals) external onlyOwner {
        createCurrencySettings(symbol, decimals);
    }

    function connectFiatTokenPair(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 initialListingId,
        uint256 initialOrderId
    ) external onlyOwner {
        address tokenAddress = getTokenAddress(tokenSymbol);
        address currencySettingsAddress = getCurrencySettingsAddress(currencySymbol);

        fiatTokenPairHandler.createFiatTokenPair(
            address(this),
            tokenAddress,
            currencySettingsAddress,
            initialListingId,
            initialOrderId
        );
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
        fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).createListing(
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
        IListingsHandler currentListingsHandler = fiatTokenPairHandler.getListingsHandler(
            listingTokenSymbol,
            listingCurrencySymbol
        );
        Listing memory listing = currentListingsHandler.getListing(listingId);

        IListingsHandler listingsHandler = fiatTokenPairHandler.getListingsHandler(
            tokenSymbol,
            currencySymbol
        );

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
        fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).deleteListing(
            listingId,
            _msgSender()
        );
    }

    function createOrder(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId,
        uint256 tokenAmount
    ) external {
        fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).createOrder(
            listingId,
            tokenAmount,
            _msgSender()
        );
    }

    function acceptOrder(
        address owner,
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        validateSignature(owner, tokenSymbol, currencySymbol, orderId, true, v, r, s);

        fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).acceptOrder(
            orderId,
            owner
        );
    }

    function rejectOrder(
        address owner,
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        validateSignature(owner, tokenSymbol, currencySymbol, orderId, false, v, r, s);

        fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).rejectOrder(
            orderId,
            owner
        );
    }

    function acceptDispute(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external onlyOwner {
        fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).acceptDispute(
            orderId,
            _msgSender()
        );
    }

    function rejectDispute(
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId
    ) external onlyOwner {
        fiatTokenPairHandler.getOrdersHandler(tokenSymbol, currencySymbol).rejectDispute(
            orderId,
            _msgSender()
        );
    }

    /**
     * External view functions
     */
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
