// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    uint8 private decimals_;

    constructor(
        string memory name,
        string memory symbol,
        uint8 _decimals
    ) ERC20(name, symbol) Ownable(_msgSender()) {
        decimals_ = _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return decimals_;
    }
}
