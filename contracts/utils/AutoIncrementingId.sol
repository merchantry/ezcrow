// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Ownable} from "../utils/Ownable.sol";

contract AutoIncrementingId is Ownable {
    uint256 private id;

    uint256 private initialId;

    constructor(uint256 _initialId) Ownable(_msgSender()) {
        id = _initialId;
        initialId = _initialId;
    }

    /**
     * @dev Returns the current id and increments it by one
     */
    function getNext() external onlyOwner returns (uint256) {
        uint256 _id = id;
        id++;

        return _id;
    }

    function getCurrent() external view returns (uint256) {
        return id;
    }

    function getInitial() external view returns (uint256) {
        return initialId;
    }

    /**
     * @dev Returns the total number of ids that have been generated
     */
    function getCount() external view returns (uint256) {
        return id - initialId;
    }

    /**
     * @dev Returns true if the given id has been generated
     */
    function exists(uint256 _id) external view returns (bool) {
        return initialId <= _id && _id < id;
    }
}
