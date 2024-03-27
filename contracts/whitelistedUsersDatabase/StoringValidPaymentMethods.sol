// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Strings} from "../utils/libraries/Strings.sol";

abstract contract StoringValidPaymentMethods {
    using Strings for string;

    error PaymentMethodAlreadyExists(string paymentMethod);

    error PaymentMethodDoesNotExist(string paymentMethod);

    mapping(bytes32 => bool) private validPaymentMethods;
    string[] private validPaymentMethodsList;

    modifier paymentMethodsAreValid(string[] memory paymentMethods) {
        for (uint256 i = 0; i < paymentMethods.length; i++) {
            if (!isValidPaymentMethod(paymentMethods[i])) {
                revert PaymentMethodDoesNotExist(paymentMethods[i]);
            }
        }

        _;
    }

    function _addValidPaymentMethod(string memory paymentMethod) internal {
        bytes32 paymentMethodHash = paymentMethod.toHash();

        if (validPaymentMethods[paymentMethodHash]) {
            revert PaymentMethodAlreadyExists(paymentMethod);
        }

        validPaymentMethods[paymentMethodHash] = true;
        validPaymentMethodsList.push(paymentMethod);
    }

    function isValidPaymentMethod(string memory paymentMethod) public view returns (bool) {
        return validPaymentMethods[paymentMethod.toHash()];
    }

    function getAllValidPaymentMethods() external view returns (string[] memory) {
        return validPaymentMethodsList;
    }
}
