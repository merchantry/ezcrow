// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IWhitelistedUsersDatabaseErrors {
    error UserAlreadyWhitelisted(address user);

    error UserNotWhitelisted(address user);
}
