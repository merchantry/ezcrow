// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {SignableFunction} from "./SignableFunction.sol";

abstract contract OrderActionSignable is SignableFunction {
    bytes32 private constant ORDER_ACTION_PERMIT_TYPEHASH =
        keccak256(
            "OrderActionPermit(address owner,string tokenSymbol,string currencySymbol,uint256 orderId,bool accept,uint256 nonce)"
        );

    function signOrderAction(
        address owner,
        string memory tokenSymbol,
        string memory currencySymbol,
        uint256 orderId,
        bool accept,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                ORDER_ACTION_PERMIT_TYPEHASH,
                owner,
                keccak256(bytes(tokenSymbol)),
                keccak256(bytes(currencySymbol)),
                orderId,
                accept,
                _useNonce(owner)
            )
        );

        validateSignature(structHash, owner, v, r, s);
    }
}
