// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import {ICurrencySettingsFactory} from "./interfaces/ICurrencySettingsFactory.sol";

abstract contract CurrencySettingsFactoryConsumer {
    ICurrencySettingsFactory private currencySettingsFactory;

    modifier currencyExists(string memory currency) {
        currencySettingsFactory.getCurrencySettingsAddress(currency);

        _;
    }

    function _setCurrencySettingsFactory(address _currencySettingsFactory) internal {
        currencySettingsFactory = ICurrencySettingsFactory(_currencySettingsFactory);
    }
}
