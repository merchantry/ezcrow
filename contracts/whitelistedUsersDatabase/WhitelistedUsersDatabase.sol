// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";
import {IWhitelistedUsersDatabase} from "./interfaces/IWhitelistedUsersDatabase.sol";
import {IWhitelistedUsersDatabaseErrors} from "./interfaces/IWhitelistedUsersDatabaseErrors.sol";

contract WhitelistedUsersDatabase is
    IWhitelistedUsersDatabase,
    IWhitelistedUsersDatabaseErrors,
    Ownable
{
    mapping(address => bool) private whitelistedUsers;
    address[] private whitelistedUsersList;

    constructor() Ownable(_msgSender()) {}

    /**
     * @dev Adds a user to the whitelist and emits a UserAdded event
     *
     * @param user address to be added to the whitelist
     */
    function add(address user) external onlyOwner {
        if (whitelistedUsers[user]) {
            revert UserAlreadyWhitelisted(user);
        }
        whitelistedUsers[user] = true;
        whitelistedUsersList.push(user);

        emit UserAdded(user);
    }

    /**
     * @dev Removes a user from the whitelist and emits a UserRemoved event.
     * The user is still kept in the array, but is filtered out in the getWhitelistedUsers function
     *
     * @param user address to be removed from the whitelist
     */
    function remove(address user) external onlyOwner {
        if (!whitelistedUsers[user]) {
            revert UserNotWhitelisted(user);
        }

        whitelistedUsers[user] = false;

        emit UserRemoved(user);
    }

    /**
     * @dev Checks if a user is whitelisted
     */
    function isWhitelisted(address user) external view returns (bool) {
        return whitelistedUsers[user];
    }

    /**
     * @dev Returns an array of whitelisted users
     */
    function getWhitelistedUsers() external view returns (address[] memory) {
        address[] memory users = new address[](whitelistedUsersList.length);
        uint256 index = 0;

        for (uint256 i = 0; i < whitelistedUsersList.length; i++) {
            if (whitelistedUsers[whitelistedUsersList[i]]) {
                users[index] = whitelistedUsersList[i];
                index++;
            }
        }

        assembly {
            mstore(users, index)
        }

        return users;
    }
}
