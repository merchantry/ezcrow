// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

interface IListingsHandlerErrors {
    error CallerIsNotEventHandler(address sender, address eventHandler);

    error UserIsNotListingCreator(uint256 listingId, address user);
}
