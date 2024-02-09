// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";
import {Strings} from "../utils/libraries/Strings.sol";
import {UserData, UserPrivateData} from "../utils/structs.sol";
import {StoringUserData} from "./StoringUserData.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

contract WhitelistedUsersDatabase is
    StoringUserData,
    IWhitelistedUsersDatabase,
    IWhitelistedUsersDatabaseErrors,
    Ownable
{
    using Strings for string;

    constructor(address owner) Ownable(owner) {}

    function updateUser(
        address user,
        string memory currency,
        string memory telegramHandle,
        string memory paymentMethod,
        string memory paymentData
    ) external onlyOwner {
        bool whitelisted = false;

        _setUserPreparedData(
            user,
            currency,
            UserData(
                user,
                currency,
                telegramHandle,
                whitelisted,
                UserPrivateData(paymentMethod, paymentData)
            )
        );

        emit UserDataUpdated(user, currency);
    }

    function whitelistUser(address user, string memory currency) external onlyOwner {
        UserData memory data = _getUserPreparedData(user, currency);
        data.whitelisted = true;

        _setUserData(user, currency, data);

        emit UserWhitelisted(user, currency);
    }

    function delistUser(address user, string memory currency) external onlyOwner {
        _setWhitelistStatus(user, currency, false);

        emit UserDelisted(user, currency);
    }

    function getUserPreparedData(
        address user,
        string memory currency
    ) external view onlyOwner returns (UserData memory) {
        return _getUserPreparedData(user, currency);
    }

    function getUserData(
        address user,
        string memory currency,
        bool showPrivateInfo
    ) external view onlyOwner returns (UserData memory) {
        UserData memory data = _getUserData(user, currency);

        if (!showPrivateInfo) {
            data.privateData.paymentMethod = "";
            data.privateData.paymentData = "";
        }

        return data;
    }

    function isWhitelisted(address user, string memory currency) external view returns (bool) {
        return _getUserData(user, currency).whitelisted;
    }
}
