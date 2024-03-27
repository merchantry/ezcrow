// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

abstract contract SignableFunction is EIP712, Nonces {
    error ERC2612InvalidSigner(address signer, address owner);

    constructor(string memory name) EIP712(name, "1") {}

    function validateSignature(
        bytes32 structHash,
        address owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view {
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
