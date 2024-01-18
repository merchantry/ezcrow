// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {FiatTokenPair} from "./FiatTokenPair.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ICurrencySettings} from "../currencySettings/interfaces/ICurrencySettings.sol";
import {Strings} from "../utils/libraries/Strings.sol";
import {Ownable} from "../utils/Ownable.sol";
import {IFiatTokenPairFactoryErrors} from "./interfaces/IFiatTokenPairFactoryErrors.sol";
import {IFiatTokenPairDeployer} from "./interfaces/IFiatTokenPairDeployer.sol";
import {IListingsHandlerDeployer} from "../listings/interfaces/IListingsHandlerDeployer.sol";
import {IOrdersHandlerDeployer} from "../orders/interfaces/IOrdersHandlerDeployer.sol";
import {IFiatTokenPair} from "./interfaces/IFiatTokenPair.sol";
import {IListingsHandler} from "../listings/interfaces/IListingsHandler.sol";
import {IOrdersHandler} from "../orders/interfaces/IOrdersHandler.sol";

abstract contract FiatTokenPairFactory is IFiatTokenPairFactoryErrors {
    using Strings for string;

    mapping(bytes32 => address) private fiatTokenPairs;

    IFiatTokenPairDeployer private fiatTokenPairDeployer;
    IListingsHandlerDeployer private listingsHandlerDeployer;
    IOrdersHandlerDeployer private ordersHandlerDeployer;

    constructor(
        address _fiatTokenPairDeployer,
        address _listingsHandlerDeployer,
        address _ordersHandlerDeployer
    ) {
        fiatTokenPairDeployer = IFiatTokenPairDeployer(_fiatTokenPairDeployer);
        listingsHandlerDeployer = IListingsHandlerDeployer(_listingsHandlerDeployer);
        ordersHandlerDeployer = IOrdersHandlerDeployer(_ordersHandlerDeployer);
    }

    function getFiatTokenPairSymbol(
        address token,
        address currencySettings
    ) private view returns (string memory) {
        string memory tokenSymbol = IERC20Metadata(token).symbol();
        string memory currencySymbol = ICurrencySettings(currencySettings).symbol();

        return tokenSymbol.concat("/").concat(currencySymbol);
    }

    function createFiatTokenPair(
        address owner,
        address token,
        address currencySettings,
        uint256 initialListingId,
        uint256 initialOrderId
    ) public virtual {
        string memory pairSymbol = getFiatTokenPairSymbol(token, currencySettings);
        bytes32 key = pairSymbol.toHash();

        if (fiatTokenPairs[key] != address(0)) {
            revert FiatTokenPairAlreadyExists(token, currencySettings);
        }

        IFiatTokenPair fiatTokenPair = fiatTokenPairDeployer.deploy(
            pairSymbol,
            token,
            currencySettings
        );

        IListingsHandler listingHandler = listingsHandlerDeployer.deploy(
            owner,
            address(fiatTokenPair),
            initialListingId
        );

        IOrdersHandler ordersHandler = ordersHandlerDeployer.deploy(
            owner,
            address(fiatTokenPair),
            initialOrderId
        );

        fiatTokenPair.setListingsHandler(address(listingHandler));
        fiatTokenPair.setOrdersHandler(address(ordersHandler));

        fiatTokenPairs[key] = address(fiatTokenPair);
    }

    function getFiatTokenPairAddress(
        string memory tokenSymbol,
        string memory currencySymbol
    ) public view returns (address) {
        string memory pairSymbol = tokenSymbol.concat("/").concat(currencySymbol);
        bytes32 key = pairSymbol.toHash();
        address fiatTokenPairAddress = fiatTokenPairs[key];

        if (fiatTokenPairAddress == address(0)) {
            revert FiatTokenPairDoesNotExist(tokenSymbol, currencySymbol);
        }

        return fiatTokenPairAddress;
    }
}
