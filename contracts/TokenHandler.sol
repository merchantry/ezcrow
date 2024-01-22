// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

abstract contract TokenHandler {
    address private token;

    constructor(address _token) {
        token = _token;
    }

    /**
     * Internal functions
     */
    function getDecimals() internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function transferFromUser(address user, uint256 amount) internal {
        IERC20(token).transferFrom(user, address(this), amount);
    }

    function transferToUser(address user, uint256 amount) internal {
        IERC20(token).transfer(user, amount);
    }
}
