// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {UserData} from "../../utils/structs.sol";

interface IWhitelistedUsersDatabase {
    event UserDataUpdated(address indexed user, string currency);
    event UserWhitelisted(address indexed user, string currency);
    event UserDelisted(address indexed user, string currency);

    function whitelistUser(address user, string memory currency) external;

    function delistUser(address user, string memory currency) external;

    function updateUser(
        address user,
        string memory currency,
        string memory telegramHandle,
        string[] memory paymentMethod
    ) external;

    function isWhitelisted(address user, string memory currency) external view returns (bool);

    function getUserData(
        address user,
        string memory currency
    ) external view returns (UserData memory);
}
