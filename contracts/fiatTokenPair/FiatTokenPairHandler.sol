// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {FiatTokenPairFactory} from "./FiatTokenPairFactory.sol";
import {IOrdersHandler} from "../orders/interfaces/IOrdersHandler.sol";
import {IListingsHandler} from "../listings/interfaces/IListingsHandler.sol";
import {IFiatTokenPair} from "./interfaces/IFiatTokenPair.sol";

abstract contract FiatTokenPairHandler is FiatTokenPairFactory {
    constructor(
        address fiatTokenPairDeployer,
        address listingsHandlerDeployer,
        address ordersHandlerDeployer
    ) FiatTokenPairFactory(fiatTokenPairDeployer, listingsHandlerDeployer, ordersHandlerDeployer) {}

    function getPair(
        string memory tokenSymbol,
        string memory currencySymbol
    ) private view returns (IFiatTokenPair) {
        return IFiatTokenPair(getFiatTokenPairAddress(tokenSymbol, currencySymbol));
    }

    function getListingsHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) internal view returns (IListingsHandler) {
        return getPair(tokenSymbol, currencySymbol).listingsHandler();
    }

    function getOrdersHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) internal view returns (IOrdersHandler) {
        return getPair(tokenSymbol, currencySymbol).ordersHandler();
    }
}
