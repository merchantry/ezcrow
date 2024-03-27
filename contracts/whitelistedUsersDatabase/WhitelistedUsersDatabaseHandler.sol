// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";
import {MultiOwnableConsumer} from "../multiOwnable/MultiOwnableConsumer.sol";
import {IFiatTokenPairHandler} from "../fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {CurrencySettingsFactoryConsumer} from "../currencySettings/CurrencySettingsFactoryConsumer.sol";
import {UserData} from "../utils/structs.sol";
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
     * @param paymentMethods User's payment methods
     */
    function updateUser(
        string memory currency,
        string memory telegramHandle,
        string[] memory paymentMethods
    ) external currencyExists(currency) paymentMethodsAreValid(paymentMethods) {
        whitelistedUsersDatabase.updateUser(_msgSender(), currency, telegramHandle, paymentMethods);
    }

    function isWhitelisted(address user, string memory currency) external view returns (bool) {
        return whitelistedUsersDatabase.isWhitelisted(user, currency);
    }

    /**
     * @dev Returns the live data for the given user and currency.
     *
     * @param user Address of the user to get the data for
     * @param currency Symbol of the currency to get the data for
     */
    function getUserData(
        address user,
        string memory currency
    ) external view currencyExists(currency) returns (UserData memory) {
        return whitelistedUsersDatabase.getUserData(user, currency);
    }
}
