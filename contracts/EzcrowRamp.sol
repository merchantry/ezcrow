// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IFiatTokenPairHandler} from "./fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {CurrencySettingsHandler} from "./currencySettings/CurrencySettingsHandler.sol";
import {TokenFactory} from "./token/TokenFactory.sol";
import {IListingsHandler} from "./listings/interfaces/IListingsHandler.sol";
import {ICurrencySettings} from "./currencySettings/interfaces/ICurrencySettings.sol";
import {WhitelistedUsersDatabaseConsumer} from "./whitelistedUsersDatabase/WhitelistedUsersDatabaseConsumer.sol";
import {OrderActionSignable} from "./OrderActionSignable.sol";

import {ListingAction, Listing} from "./utils/structs.sol";
import {OrderStatus} from "./utils/enums.sol";
import {Strings} from "./utils/libraries/Strings.sol";
import {OrderStatusHandler} from "./orders/libraries/OrderStatusHandler.sol";
import {MultiOwnableConsumer} from "./multiOwnable/MultiOwnableConsumer.sol";

contract EzcrowRamp is
    CurrencySettingsHandler,
    TokenFactory,
    OrderActionSignable,
    WhitelistedUsersDatabaseConsumer,
    MultiOwnableConsumer
{
    using Strings for string;
    using OrderStatusHandler for OrderStatus[];

    IFiatTokenPairHandler private fiatTokenPairHandler;

    constructor(
        address multiOwnable,
        address whitelistedUsersDatabase
    )
        OrderActionSignable("EzcrowRamp")
        MultiOwnableConsumer(multiOwnable)
        WhitelistedUsersDatabaseConsumer(whitelistedUsersDatabase)
    {}

    /**
     * External functions
     */

    /**
     * @dev The initialization of fiatTokenPairHandler is done outside of the constructor
     * since we need to pass this contract's address to the fiatTokenPairHandler constructor as the owner
     * and we want to keep the deployment of that contract outside of this one.
     */
    function setFiatTokenPairHandler(address fiatTokenPairHandlerAddress) external onlyOwner {
        fiatTokenPairHandler = IFiatTokenPairHandler(fiatTokenPairHandlerAddress);
    }

    /**
     * @dev Registers the ERC20 token from the given address as available for trading.
     * The token is saved under a hash of its symbol, so a new token with the same symbol
     * cannot be added.
     * @param token address of the token to be added
     */
    function addToken(address token) external onlyOwner {
        addTokenAddress(token);
    }

    /**
     * @dev Creates a new currency settings contract and registers currency as available for trading.
     * The currency is saved under a hash of its symbol, so a new currency with the same symbol
     * cannot be added.
     *
     * @param symbol Symbol of the currency to be added
     * @param decimals Number of decimals of the currency to be added
     */
    function addCurrencySettings(string memory symbol, uint8 decimals) external onlyOwner {
        createCurrencySettings(symbol, decimals);
    }

    /**
     * @dev Creates a new fiatTokenPair contract for the given token and currency symbols.
     * The token and currency must be registered before calling this function. The initial listing
     * and order ids are used to initialize the listings and orders handlers. Will also revert if
     * a fiatTokenPair contract with the same token and currency symbols already exists.
     *
     * This function is kept separate from adding the token and currency settings since we want to
     * create a fiatTokenPair contract for each token and currency pair. This function would
     * fail if more than one pair is created in one call.
     *
     * @param tokenSymbol of the token to be traded in the pair
     * @param currencySymbol of the currency to be traded in the pair
     * @param initialListingId used by the listings handler to initialize the listings ids
     * @param initialOrderId used by the orders handler to initialize the orders ids
     */
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

    /**
     * @dev Updates the currency decimals settings for the given currency.
     *
     * @param symbol Symbol of the currency to be updated
     * @param decimals New number of decimals for the currency
     */
    function setCurrencyDecimals(string memory symbol, uint8 decimals) external onlyOwner {
        _setCurrencyDecimals(symbol, decimals);
    }

    /**
     * @dev Creates a new listing for the given token and currency symbols.
     * The token and currency must be registered before calling this function.
     * The listing is created in the fiatTokenPair contract for the given token and currency.
     *
     * @param tokenSymbol of the token to be traded in the pair
     * @param currencySymbol of the currency to be traded in the pair
     */
    function createListing(
        string memory tokenSymbol,
        string memory currencySymbol,
        ListingAction action,
        uint256 price,
        uint256 tokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) external onlyWLUsers(_msgSender(), currencySymbol) {
        fiatTokenPairHandler.getListingsHandler(tokenSymbol, currencySymbol).createListing(
            action,
            price,
            tokenAmount,
            minPricePerOrder,
            maxPricePerOrder,
            _msgSender()
        );
    }

    /**
     * @dev Updates the listing with the given token and currency symbol and id with the given data.
     * Both the current and new token and currency must be registered before calling this function.
     * The listing is updated in the fiatTokenPair contract for the given token and currency.
     *
     * If the token or currency symbols or the listing action  are changed, the listing is
     * deleted from the current fiatTokenPair contract and created in the new one.
     *
     *
     * @param listingTokenSymbol current token symbol of the listing to be updated
     * @param listingCurrencySymbol current currency symbol of the listing to be updated
     * @param listingId Id of the listing to be updated
     * @param tokenSymbol new token symbol to be updated on the listing
     * @param currencySymbol new currency symbol to be updated on the listing
     *
     */
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
    ) external onlyWLUsers(_msgSender(), currencySymbol) {
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

    /**
     * @dev Deletes the listing with the given token and currency symbol and id.
     */
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

    /**
     * @dev Creates a new order for the given token and currency symbols and listing id.
     * The token and currency must be registered before calling this function and the listing
     * must exist in the fiatTokenPair.
     *
     * @param tokenSymbol of the token to be traded in the pair
     * @param currencySymbol of the currency to be traded in the pair
     * @param listingId Id of the listing the order is for
     * @param tokenAmount Amount of tokens to be bought or sold
     */
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

    /**
     * @dev This is a signable function. It allows the users to sign a transaction
     * and for it to be triggered by anyone. Which potentially allows for a gasless transaction
     * from the user's side. Accepts the order.
     *
     * @param owner Address of the owner of the signature and user interacting with the order
     * @param tokenSymbol of the token to traded in the pair
     * @param currencySymbol of the currency to be traded in the pair
     * @param orderId Id of the order to be accepted
     */
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

    /**
     * @dev This is a signable function. It allows the users to sign a transaction
     * and for it to be triggered by anyone. Which potentially allows for a gasless transaction
     * from the user's side. Rejects the order.
     *
     * @param owner Address of the owner of the signature and user interacting with the order
     * @param tokenSymbol of the token to traded in the pair
     * @param currencySymbol of the currency to be traded in the pair
     * @param orderId Id of the order to be accepted
     */
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

    /**
     * @dev Cancels the order with the given token and currency symbols and id.
     */
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

    /**
     * @dev Completes the order with the given token and currency symbols and id.
     */
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

    /**
     * @dev Returns all tradable token symbols
     */
    function getTokenSymbols() external view returns (string[] memory) {
        address[] memory tokenAddresses = getAllTokenAddresses();
        string[] memory tokenSymbols = new string[](tokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            tokenSymbols[i] = IERC20Metadata(tokenAddresses[i]).symbol();
        }

        return tokenSymbols;
    }

    /**
     * @dev Returns all tradable currency symbols
     */
    function getCurrencySymbols() external view returns (string[] memory) {
        address[] memory currencySettingsAddresses = getAllCurrencySettingsAdrresses();
        string[] memory currencySymbols = new string[](currencySettingsAddresses.length);

        for (uint256 i = 0; i < currencySettingsAddresses.length; i++) {
            currencySymbols[i] = ICurrencySettings(currencySettingsAddresses[i]).symbol();
        }

        return currencySymbols;
    }
}
