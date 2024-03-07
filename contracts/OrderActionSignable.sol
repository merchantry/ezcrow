// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

abstract contract OrderActionSignable is EIP712, Nonces {
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256(
            "OrderActionPermit(address owner,string tokenSymbol,string currencySymbol,uint256 orderId,bool accept,uint256 nonce)"
        );

    error ERC2612InvalidSigner(address signer, address owner);

    constructor(string memory name) EIP712(name, "1") {}

    function validateSignature(
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
                PERMIT_TYPEHASH,
                owner,
                keccak256(bytes(tokenSymbol)),
                keccak256(bytes(currencySymbol)),
                orderId,
                accept,
                _useNonce(owner)
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);
        if (signer != owner) {
            revert ERC2612InvalidSigner(signer, owner);
        }
    }

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }
}
