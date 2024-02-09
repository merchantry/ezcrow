// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IMultiOwnable} from "./interfaces/IMultiOwnable.sol";
import {IMultiOwnableErrors} from "./interfaces/IMultiOwnableErrors.sol";

contract MultiOwnable is IMultiOwnable, IMultiOwnableErrors {
    mapping(address => bool) private _owners;

    modifier onlyOwner() {
        if (!isOwner(_msgSender())) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }

        _;
    }

    constructor() {
        _owners[_msgSender()] = true;
    }

    /**
     * Private functions
     */

    function _addOwner(address account) private {
        _owners[account] = true;

        emit OwnerAdded(account);
    }

    function _removeOwner(address account) private {
        _owners[account] = false;

        emit OwnerRemoved(account);
    }

    function _msgSender() private view returns (address) {
        return msg.sender;
    }

    /**
     * External functions
     */

    function addOwner(address account) external onlyOwner {
        _addOwner(account);
    }

    function removeOwner(address account) external onlyOwner {
        _removeOwner(account);
    }

    /**
     * External view functions
     */

    function isOwner(address account) public view returns (bool) {
        return _owners[account];
    }
}
