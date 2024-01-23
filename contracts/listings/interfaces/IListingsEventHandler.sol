// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {Listing} from "../../utils/structs.sol";

interface IListingsEventHandler {
    function onListingCreated(Listing memory listing) external;

    function onListingUpdated(uint256 previousAmount, Listing memory listing) external;

    function onListingDeleted(Listing memory listing) external;

    function beforeListingCreate(
        uint256 price,
        uint256 totalTokenAmount,
        uint256 minPricePerOrder,
        uint256 maxPricePerOrder
    ) external view;

    function beforeListingUpdate(uint256 id) external view;

    function beforeListingDelete(uint256 id) external view;
}
