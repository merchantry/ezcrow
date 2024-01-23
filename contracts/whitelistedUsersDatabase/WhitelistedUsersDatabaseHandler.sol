// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WhitelistedUsersDatabase} from "./WhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

abstract contract WhitelistedUsersDatabaseHandler is IWhitelistedUsersDatabaseErrors, Ownable {
    IWhitelistedUsersDatabase private whitelistedUsersDatabase;

    modifier onlyWLUsers() {
        address sender = _msgSender();
        if (!isWhitelisted(sender)) {
            revert UserNotWhitelisted(sender);
        }

        _;
    }

    constructor() Ownable(_msgSender()) {
        whitelistedUsersDatabase = new WhitelistedUsersDatabase();
    }

    function addUserToWhitelist(address user) external onlyOwner {
        whitelistedUsersDatabase.add(user);
    }

    function removeUserFromWhiteList(address user) external onlyOwner {
        whitelistedUsersDatabase.remove(user);
    }

    function isWhitelisted(address user) public view returns (bool) {
        return whitelistedUsersDatabase.isWhitelisted(user);
    }

    function getWhitelistedUsersDatabaseAddress() external view returns (address) {
        return address(whitelistedUsersDatabase);
    }
}
