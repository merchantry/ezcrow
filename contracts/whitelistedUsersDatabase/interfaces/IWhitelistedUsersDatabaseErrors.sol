// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IWhitelistedUsersDatabaseErrors {
    error UserNotWhitelisted(address user, string currency);

    error UserNotAuthorized(address user);
}
