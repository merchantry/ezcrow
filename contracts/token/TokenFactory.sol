// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ITokenFactoryErrors} from "./interfaces/ITokenFactoryErrors.sol";
import {Strings} from "../utils/libraries/Strings.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

abstract contract TokenFactory is ITokenFactoryErrors {
    using Strings for string;

    mapping(bytes32 => address) private tokenAddresses;
    bytes32[] private tokenKeys;

    function addTokenAddress(address tokenAddress) internal {
        string memory symbol = IERC20Metadata(tokenAddress).symbol();
        bytes32 key = symbol.toHash();
        if (tokenAddresses[key] != address(0)) {
            revert TokenAlreadyExists(symbol);
        }

        tokenAddresses[key] = tokenAddress;
        tokenKeys.push(key);
    }

    function getTokenAddress(string memory symbol) public view returns (address) {
        bytes32 key = symbol.toHash();
        address tokenAddress = tokenAddresses[key];

        if (tokenAddress == address(0)) {
            revert TokenDoesNotExist(symbol);
        }

        return tokenAddress;
    }

    function getAllTokenAddresses() public view returns (address[] memory) {
        address[] memory addresses = new address[](tokenKeys.length);

        for (uint256 i = 0; i < tokenKeys.length; i++) {
            addresses[i] = tokenAddresses[tokenKeys[i]];
        }

        return addresses;
    }
}
