// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IMultiOwnable} from "./interfaces/IMultiOwnable.sol";
import {IMultiOwnableErrors} from "./interfaces/IMultiOwnableErrors.sol";

abstract contract MultiOwnableConsumer is IMultiOwnableErrors {
    IMultiOwnable private multiOwnable;

    modifier onlyOwner() {
        if (!multiOwnable.isOwner(_msgSender())) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }

        _;
    }

    constructor(address _multiOwnable) {
        multiOwnable = IMultiOwnable(_multiOwnable);
    }

    function _msgSender() internal view returns (address) {
        return msg.sender;
    }

    function isOwner(address user) internal view returns (bool) {
        return multiOwnable.isOwner(user);
    }

    function getMultiOwnableAddress() external view returns (address) {
        return address(multiOwnable);
    }
}
