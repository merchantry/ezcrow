// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {SignableFunction} from "./SignableFunction.sol";

abstract contract OrderCreateSignable is SignableFunction {
    bytes32 private constant ORDER_CREATE_PERMIT_TYPEHASH =
        keccak256(
            "OrderCreatePermit(address owner,string tokenSymbol,string currencySymbol,uint256 listingId,uint256 tokenAmount,uint256 nonce)"
        );

    function signOrderCreate(
        address owner,
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 listingId,
        uint256 tokenAmount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        uint256 nonce = _useNonce(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_CREATE_PERMIT_TYPEHASH,
                owner,
                keccak256(bytes(tokenSymbol)),
                keccak256(bytes(currencySymbol)),
                listingId,
                tokenAmount,
                nonce
            )
        );

        validateSignature(structHash, owner, v, r, s);
    }
}
