// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {WhitelistedUsersDatabase} from "./WhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";
import {MultiOwnableConsumer} from "../multiOwnable/MultiOwnableConsumer.sol";
import {IFiatTokenPairHandler} from "../fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {CurrencySettingsFactoryConsumer} from "../currencySettings/CurrencySettingsFactoryConsumer.sol";
import {UserData, Order} from "../utils/structs.sol";
import {OrderStatus} from "../utils/enums.sol";
import {OrderStatusHandler} from "../orders/libraries/OrderStatusHandler.sol";
import {StoringValidPaymentMethods} from "./StoringValidPaymentMethods.sol";

contract WhitelistedUsersDatabaseHandler is
    IWhitelistedUsersDatabaseErrors,
    MultiOwnableConsumer,
    CurrencySettingsFactoryConsumer,
    StoringValidPaymentMethods
{
    using OrderStatusHandler for OrderStatus[];

    IWhitelistedUsersDatabase public whitelistedUsersDatabase;
    IFiatTokenPairHandler private fiatTokenPairHandler;

    constructor(address _multiOwnable) MultiOwnableConsumer(_multiOwnable) {}

    function setWhitelistedUsersDatabase(address _whitelistedUsersDatabase) external onlyOwner {
        whitelistedUsersDatabase = IWhitelistedUsersDatabase(_whitelistedUsersDatabase);
    }

    function setFiatTokenPairHandler(address _fiatTokenPairHandler) external onlyOwner {
        fiatTokenPairHandler = IFiatTokenPairHandler(_fiatTokenPairHandler);
    }

    function setCurrencySettingsFactory(address _currencySettingsFactory) external onlyOwner {
        _setCurrencySettingsFactory(_currencySettingsFactory);
    }

    /**
     * @dev Adds a valid payment method to the list of valid payment methods.
     * The payment method can be fetched in the getAllValidPaymentMethods function.
     * Only registered payment methods can be used to update user data.
     *
     * @param paymentMethod Payment method to be added
     */
    function addValidPaymentMethod(string memory paymentMethod) external onlyOwner {
        _addValidPaymentMethod(paymentMethod);
    }

    /**
     * @dev Whitelists user for the given currency. Applies the latest user provided data
     * from the prepared to live data.
     *
     * @param user Address of the user to be whitelisted
     * @param currency Symbol of the currency to be whitelisted for
     */
    function whitelistUser(
        address user,
        string memory currency
    ) external onlyOwner currencyExists(currency) {
        whitelistedUsersDatabase.whitelistUser(user, currency);
    }

    /**
     * @dev Delists user for the given currency, dissalowing them to create new listings.
     *
     * @param user Address of the user to be delisted
     * @param currency Symbol of the currency to be delisted for
     */
    function delistUser(
        address user,
        string memory currency
    ) external onlyOwner currencyExists(currency) {
        whitelistedUsersDatabase.delistUser(user, currency);
    }

    /**
     * @dev Updates the senders's prepared data for the given currency. The user must be whitelisted
     * for the given currency for data to be available in getUserData.
     *
     * @param currency Symbol of the currency to be updated for
     * @param telegramHandle User's telegram handle
     * @param paymentMethod User's payment method
     * @param paymentData User's payment data
     */
    function updateUser(
        string memory currency,
        string memory telegramHandle,
        string memory paymentMethod,
        string memory paymentData
    ) external currencyExists(currency) validPaymentMethod(paymentMethod) {
        whitelistedUsersDatabase.updateUser(
            _msgSender(),
            currency,
            telegramHandle,
            paymentMethod,
            paymentData
        );
    }

    function isWhitelisted(address user, string memory currency) external view returns (bool) {
        return whitelistedUsersDatabase.isWhitelisted(user, currency);
    }

    /**
     * @dev Returns the prepared data for the given user and currency. Once the user
     * is whitelisted by the owner, the prepared data is moved to live data.
     *
     * @param user Address of the user to get the data for
     * @param currency Symbol of the currency to get the data for
     */
    function getUserPreparedData(
        address user,
        string memory currency
    ) external view onlyOwner returns (UserData memory) {
        return whitelistedUsersDatabase.getUserPreparedData(user, currency);
    }

    /**
     * @dev Returns the live data for the given user and currency.
     * Only shows the private info if the sender is the owner or the user.
     *
     * @param user Address of the user to get the data for
     * @param currency Symbol of the currency to get the data for
     */
    function getUserData(
        address user,
        string memory currency
    ) external view currencyExists(currency) returns (UserData memory) {
        return
            whitelistedUsersDatabase.getUserData(
                user,
                currency,
                isOwner(_msgSender()) || _msgSender() == user
            );
    }

    /**
     * @dev Returns user data and conditially hides private info
     * based on the order status and user role. If the sender is the owner,
     * the user, or a participant in the order with an active status with the user,
     * the private info is shown.
     *
     * @param user Address of the user to get the data for
     * @param token Symbol of the token of the order
     * @param currency Symbol of the currency of the order
     * @param orderId Id of the order
     */
    function getUserDataWithOrder(
        address user,
        string memory token,
        string memory currency,
        uint256 orderId
    ) external view returns (UserData memory) {
        Order memory order = fiatTokenPairHandler.getOrdersHandler(token, currency).getOrder(
            orderId
        );
        OrderStatus orderStatus = order.statusHistory.getCurrentStatus();

        address sender = _msgSender();
        bool orderIsActive = orderStatus == OrderStatus.AssetsConfirmed ||
            orderStatus == OrderStatus.TokensDeposited ||
            orderStatus == OrderStatus.PaymentSent ||
            orderStatus == OrderStatus.InDispute;
        bool userIsParticipant = sender == order.creator || sender == order.listingCreator;
        bool showPrivateInfo = isOwner(sender) ||
            sender == user ||
            (userIsParticipant && orderIsActive);

        return whitelistedUsersDatabase.getUserData(user, currency, showPrivateInfo);
    }
}
