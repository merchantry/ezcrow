// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IOrdersHandler} from "../../orders/interfaces/IOrdersHandler.sol";
import {IListingsHandler} from "../../listings/interfaces/IListingsHandler.sol";

interface IFiatTokenPairHandler {
    function createFiatTokenPair(
        address owner,
        address token,
        address currencySettings,
        uint256 initialListingId,
        uint256 initialOrderId
    ) external;

    function getListingsHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (IListingsHandler);

    function getOrdersHandler(
        string memory tokenSymbol,
        string memory currencySymbol
    ) external view returns (IOrdersHandler);
}
