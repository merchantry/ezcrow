// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";
import {Strings} from "../utils/libraries/Strings.sol";
import {UserData} from "../utils/structs.sol";
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
        string[] memory paymentMethods
    ) external onlyOwner {
        _setUserData(user, currency, UserData(user, currency, telegramHandle, paymentMethods));

        emit UserDataUpdated(user, currency);
    }

    function whitelistUser(address user, string memory currency) external onlyOwner {
        _setWhitelistStatus(user, currency, true);

        emit UserWhitelisted(user, currency);
    }

    function delistUser(address user, string memory currency) external onlyOwner {
        _setWhitelistStatus(user, currency, false);

        emit UserDelisted(user, currency);
    }

    function getUserData(
        address user,
        string memory currency
    ) external view onlyOwner returns (UserData memory) {
        return _getUserData(user, currency);
    }

    function isWhitelisted(address user, string memory currency) external view returns (bool) {
        return _getUserWhiteListStatus(user, currency);
    }
}
