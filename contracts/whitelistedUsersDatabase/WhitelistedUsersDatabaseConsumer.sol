// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

abstract contract WhitelistedUsersDatabaseConsumer is IWhitelistedUsersDatabaseErrors {
    IWhitelistedUsersDatabase private whitelistedUsersDatabase;

    modifier onlyWLUsers(address user, string memory currency) {
        if (!whitelistedUsersDatabase.isWhitelisted(user, currency)) {
            revert UserNotWhitelisted(user, currency);
        }

        _;
    }

    constructor(address _whitelistedUsersDatabase) {
        whitelistedUsersDatabase = IWhitelistedUsersDatabase(_whitelistedUsersDatabase);
    }
}
