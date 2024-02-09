// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";
import {Strings} from "../utils/libraries/Strings.sol";
import {UserData, UserPrivateData} from "../utils/structs.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

contract StoringUserData {
    using Strings for string;

    mapping(address => mapping(bytes32 => UserData)) private _userData;
    mapping(address => mapping(bytes32 => UserData)) private _userPreparedData;

    function _getUserData(
        address user,
        string memory currency
    ) internal view returns (UserData storage) {
        return _userData[user][currency.toHash()];
    }

    function _getUserPreparedData(
        address user,
        string memory currency
    ) internal view returns (UserData storage) {
        return _userPreparedData[user][currency.toHash()];
    }

    function _setUserData(address user, string memory currency, UserData memory data) internal {
        _userData[user][currency.toHash()] = data;
    }

    function _setUserPreparedData(
        address user,
        string memory currency,
        UserData memory data
    ) internal {
        _userPreparedData[user][currency.toHash()] = data;
    }

    function _setWhitelistStatus(address user, string memory currency, bool whitelisted) internal {
        _userData[user][currency.toHash()].whitelisted = whitelisted;
    }
}
