// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IFiatTokenPair} from "./IFiatTokenPair.sol";

interface IFiatTokenPairDeployer {
    function deploy(
        string memory pairSymbol,
        address token,
        address currencySettings
    ) external returns (IFiatTokenPair);
}
