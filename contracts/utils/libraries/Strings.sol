// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

library Strings {
    function concat(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }

    function toHash(string memory a) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(a));
    }

    function matches(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
