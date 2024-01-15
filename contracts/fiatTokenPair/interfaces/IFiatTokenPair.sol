// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {IListingsHandler} from "../../listings/interfaces/IListingsHandler.sol";
import {IOrdersHandler} from "../../orders/interfaces/IOrdersHandler.sol";

interface IFiatTokenPair {
    function setListingsHandler(address listingsHandler) external;

    function setOrdersHandler(address ordersHandler) external;

    function listingsHandler() external view returns (IListingsHandler);

    function ordersHandler() external view returns (IOrdersHandler);
}
