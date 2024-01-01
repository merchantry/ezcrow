// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IWhitelistedUsersDatabase {
    event UserAdded(address indexed user);
    event UserRemoved(address indexed user);

    function add(address user) external;

    function remove(address user) external;

    function isWhitelisted(address user) external view returns (bool);
}
