// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Strings} from "../utils/libraries/Strings.sol";
import {UserData} from "../utils/structs.sol";

contract StoringUserData {
    using Strings for string;

    mapping(address => mapping(bytes32 => UserData)) private _userData;
    mapping(address => mapping(bytes32 => bool)) private _userWhitelisted;

    function _getUserData(
        address user,
        string memory currency
    ) internal view returns (UserData storage) {
        return _userData[user][currency.toHash()];
    }

    function _getUserWhiteListStatus(
        address user,
        string memory currency
    ) internal view returns (bool) {
        return _userWhitelisted[user][currency.toHash()];
    }

    function _setUserData(address user, string memory currency, UserData memory data) internal {
        _userData[user][currency.toHash()] = data;
    }

    function _setWhitelistStatus(address user, string memory currency, bool whitelisted) internal {
        _userWhitelisted[user][currency.toHash()] = whitelisted;
    }
}
