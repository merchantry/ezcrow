// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface ITokenFactoryErrors {
    error TokenAlreadyExists(string symbol);

    error TokenDoesNotExist(string symbol);
}
