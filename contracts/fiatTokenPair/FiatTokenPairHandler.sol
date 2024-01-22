// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {FiatTokenPairFactory} from "./FiatTokenPairFactory.sol";
import {IFiatTokenPairHandler} from "./interfaces/IFiatTokenPairHandler.sol";
import {IOrdersHandler} from "../orders/interfaces/IOrdersHandler.sol";
import {IListingsHandler} from "../listings/interfaces/IListingsHandler.sol";
import {IFiatTokenPair} from "./interfaces/IFiatTokenPair.sol";
import {Ownable} from "../utils/Ownable.sol";

contract FiatTokenPairHandler is FiatTokenPairFactory, IFiatTokenPairHandler, Ownable {
    constructor(
        address fiatTokenPairDeployer,
        address listingsKeyStorageDeployer,
        address listingsHandlerDeployer,
        address ordersKeyStorageDeployer,
        address ordersHandlerDeployer,
        address owner
    )
        FiatTokenPairFactory(
            fiatTokenPairDeployer,
            listingsKeyStorageDeployer,
            listingsHandlerDeployer,
            ordersKeyStorageDeployer,
            ordersHandlerDeployer
        )
        Ownable(owner)
    {}

    function getPair(
        string memory tokenSymbol,
        string memory currencySymbol
    ) private view returns (IFiatTokenPair) {
        return IFiatTokenPair(getFiatTokenPairAddress(tokenSymbol, currencySymbol));
    }

    function createFiatTokenPair(
        address owner,
        address token,
        address currencySettings,
        uint256 initialListingId,
        uint256 initialOrderId
    ) public override(FiatTokenPairFactory, IFiatTokenPairHandler) onlyOwner {
        super.createFiatTokenPair(owner, token, currencySettings, initialListingId, initialOrderId);
    }

    function getListingsHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (IListingsHandler) {
        return getPair(tokenSymbol, currencySymbol).listingsHandler();
    }

    function getOrdersHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (IOrdersHandler) {
        return getPair(tokenSymbol, currencySymbol).ordersHandler();
    }
}
