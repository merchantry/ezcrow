// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

abstract contract Ownable {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);

    constructor(address owner_) {
        _owner = owner_;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    modifier onlyOwner() {
        if (_msgSender() != owner()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }

        _;
    }
}
