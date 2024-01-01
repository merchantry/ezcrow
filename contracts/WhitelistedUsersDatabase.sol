// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";

contract WhitelistedUsersDatabase is IWhitelistedUsersDatabase, Ownable {
    mapping(address => bool) private whitelistedUsers;

    constructor() Ownable(_msgSender()) {}

    function add(address user) external onlyOwner {
        whitelistedUsers[user] = true;

        emit UserAdded(user);
    }

    function remove(address user) external onlyOwner {
        whitelistedUsers[user] = false;

        emit UserRemoved(user);
    }

    function isWhitelisted(address user) external view returns (bool) {
        return whitelistedUsers[user];
    }
}
