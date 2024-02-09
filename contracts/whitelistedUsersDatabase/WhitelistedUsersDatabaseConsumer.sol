// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {WhitelistedUsersDatabase} from "./WhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";
import {MultiOwnableConsumer} from "../multiOwnable/MultiOwnableConsumer.sol";
import {IFiatTokenPairHandler} from "../fiatTokenPair/interfaces/IFiatTokenPairHandler.sol";
import {ICurrencySettingsFactory} from "../currencySettings/interfaces/ICurrencySettingsFactory.sol";
import {UserData, Order} from "../utils/structs.sol";
import {OrderStatus} from "../utils/enums.sol";
import {OrderStatusHandler} from "../orders/libraries/OrderStatusHandler.sol";

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
