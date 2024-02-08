// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract MultiOwnable {
    mapping(address => bool) private _owners;

    error OwnableUnauthorizedAccount(address account);

    event OwnerAdded(address indexed account);

    event OwnerRemoved(address indexed account);

    modifier onlyOwner() {
        if (!isOwner(_msgSender())) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }

        _;
    }

    constructor(address owner_) {
        _owners[owner_] = true;
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

    /**
     * Internal functions
     */

    function _msgSender() internal view virtual returns (address) {
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
