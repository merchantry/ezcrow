// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {WhitelistedUsersDatabase} from "./WhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

abstract contract WhitelistedUsersDatabaseHandler is IWhitelistedUsersDatabaseErrors {
    IWhitelistedUsersDatabase private whitelistedUsersDatabase;

    modifier onlyWLUsers(address sender) {
        if (!isWhitelisted(sender)) {
            revert UserNotWhitelisted(sender);
        }

        _;
    }

    constructor() {
        whitelistedUsersDatabase = new WhitelistedUsersDatabase();
    }

    function _addUserToWhitelist(address user) internal {
        whitelistedUsersDatabase.add(user);
    }

    function _removeUserFromWhiteList(address user) internal {
        whitelistedUsersDatabase.remove(user);
    }

    function isWhitelisted(address user) public view returns (bool) {
        return whitelistedUsersDatabase.isWhitelisted(user);
    }

    function getWhitelistedUsersDatabaseAddress() external view returns (address) {
        return address(whitelistedUsersDatabase);
    }
}
