// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IMultiOwnable {
    event OwnerAdded(address indexed account);

    event OwnerRemoved(address indexed account);

    function isOwner(address account) external view returns (bool);
}
