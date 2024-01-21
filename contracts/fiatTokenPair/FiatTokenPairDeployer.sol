// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {FiatTokenPair} from "./FiatTokenPair.sol";
import {IFiatTokenPair} from "./interfaces/IFiatTokenPair.sol";
import {IFiatTokenPairDeployer} from "./interfaces/IFiatTokenPairDeployer.sol";

contract FiatTokenPairDeployer is IFiatTokenPairDeployer {
    function deploy(
        string memory pairSymbol,
        address token,
        address currencySettings
    ) external returns (IFiatTokenPair) {
        return new FiatTokenPair(pairSymbol, token, currencySettings, msg.sender);
    }
}
