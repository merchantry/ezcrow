const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const TOKEN_NAME = 'Test Token';
const TOKEN_SYMBOL = 'TT';
const CURRENCY_DECIMALS = 3;
const TOKEN_DECIMALS = 18;
const CURRENCY_SYMBOL = 'USD';
const TELEGRAM_HANDLE = 'userA_telegram';
const PAYMENT_METHODS = ['PayPal', 'Bank Transfer'];

describe('WhitelistedUsersDatabaseHandler', function () {
  async function deployFixture() {
    const [owner, otherUser, userA] = await ethers.getSigners();

    const fiatTokenPairDeployer = await ethers
      .getContractFactory('FiatTokenPairDeployer')
      .then(contract => contract.deploy());

    const listingsKeyStorageDeployer = await ethers
      .getContractFactory('ListingsKeyStorageDeployer')
      .then(contract => contract.deploy());

    const listingsHandlerDeployer = await ethers
      .getContractFactory('ListingsHandlerDeployer')
      .then(contract => contract.deploy());

    const ordersKeyStorageDeployer = await ethers
      .getContractFactory('OrdersKeyStorageDeployer')
      .then(contract => contract.deploy());

    const ordersHandlerDeployer = await ethers
      .getContractFactory('OrdersHandlerDeployer')
      .then(contract => contract.deploy());

    const token = await ethers
      .getContractFactory('TestToken')
      .then(contract =>
        contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS)
      );

    const multiOwnable = await ethers
      .getContractFactory('MultiOwnable')
      .then(contract => contract.deploy());

    const wudbHandler = await ethers
      .getContractFactory('WhitelistedUsersDatabaseHandler')
      .then(contract => contract.deploy(multiOwnable.target));

    const wudb = await ethers
      .getContractFactory('WhitelistedUsersDatabase')
      .then(contract => contract.deploy(wudbHandler.target));

    const ezcrowRamp = await ethers
      .getContractFactory('EzcrowRamp')
      .then(contract => contract.deploy(multiOwnable.target, wudb.target));

    const fiatTokenPairHandler = await ethers
      .getContractFactory('FiatTokenPairHandler')
      .then(contract =>
        contract.deploy(
          fiatTokenPairDeployer.target,
          listingsKeyStorageDeployer.target,
          listingsHandlerDeployer.target,
          ordersKeyStorageDeployer.target,
          ordersHandlerDeployer.target,
          ezcrowRamp.target
        )
      );

    await ezcrowRamp.setFiatTokenPairHandler(fiatTokenPairHandler.target);

    await wudbHandler.setWhitelistedUsersDatabase(wudb.target);
    await wudbHandler.setFiatTokenPairHandler(fiatTokenPairHandler.target);
    await wudbHandler.setCurrencySettingsFactory(ezcrowRamp.target);

    const ezcrowRampQuery = await ethers
      .getContractFactory('EzcrowRampQuery')
      .then(contract => contract.deploy(fiatTokenPairHandler.target));

    return {
      ezcrowRamp,
      ezcrowRampQuery,
      fiatTokenPairHandler,
      wudb,
      wudbHandler,
      token,
      owner,
      otherUser,
      userA,
    };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { wudbHandler } = this;

      expect(wudbHandler.target).not.to.be.undefined;
    });
  });

  describe('addValidPaymentMethod', function () {
    it('adds valid payment method', async function () {
      const { wudbHandler } = this;

      const method = PAYMENT_METHODS[0];

      await wudbHandler.addValidPaymentMethod(method);

      const isValidPaymentMethod =
        await wudbHandler.isValidPaymentMethod(method);

      expect(isValidPaymentMethod).to.be.true;
    });

    it('adds payment methods to a list', async function () {
      const { wudbHandler } = this;

      for (const paymentMethod of PAYMENT_METHODS) {
        await wudbHandler.addValidPaymentMethod(paymentMethod);
      }

      const paymentMethods = await wudbHandler.getAllValidPaymentMethods();

      expect(paymentMethods).to.deep.equal(PAYMENT_METHODS);
    });

    it('reverts if not accessed by owner', async function () {
      const { wudbHandler, otherUser } = this;

      await expect(
        wudbHandler.connect(otherUser).addValidPaymentMethod(PAYMENT_METHODS[0])
      )
        .to.be.revertedWithCustomError(
          wudbHandler,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(otherUser.address);
    });
  });

  describe('whitelistUser', function () {
    beforeEach(async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
    });

    it('adds user to whitelist', async function () {
      const { wudbHandler, otherUser } = this;

      await wudbHandler.whitelistUser(otherUser.address, CURRENCY_SYMBOL);

      const isWhitelisted = await wudbHandler.isWhitelisted(
        otherUser.address,
        CURRENCY_SYMBOL
      );

      expect(isWhitelisted).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { wudbHandler, otherUser } = this;

      await expect(
        wudbHandler
          .connect(otherUser)
          .whitelistUser(otherUser.address, CURRENCY_SYMBOL)
      )
        .to.be.revertedWithCustomError(
          wudbHandler,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(otherUser.address);
    });
  });

  describe('delistUser', function () {
    beforeEach(async function () {
      const { ezcrowRamp, wudbHandler, otherUser } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
      await wudbHandler.whitelistUser(otherUser.address, CURRENCY_SYMBOL);
    });

    it('adds user to whitelist', async function () {
      const { wudbHandler, otherUser } = this;

      await wudbHandler.delistUser(otherUser.address, CURRENCY_SYMBOL);

      const isWhitelisted = await wudbHandler.isWhitelisted(
        otherUser.address,
        CURRENCY_SYMBOL
      );

      expect(isWhitelisted).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { wudbHandler, otherUser } = this;

      await expect(
        wudbHandler
          .connect(otherUser)
          .delistUser(otherUser.address, CURRENCY_SYMBOL)
      )
        .to.be.revertedWithCustomError(
          wudbHandler,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(otherUser.address);
    });
  });

  describe('updateUser', function () {
    beforeEach(async function () {
      const { ezcrowRamp, wudbHandler } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
      for (const paymentMethod of PAYMENT_METHODS) {
        await wudbHandler.addValidPaymentMethod(paymentMethod);
      }
    });

    it('updates user data', async function () {
      const { wudbHandler, owner } = this;

      await wudbHandler.updateUser(
        CURRENCY_SYMBOL,
        TELEGRAM_HANDLE,
        PAYMENT_METHODS
      );

      const userData = await wudbHandler.getUserData(
        owner.address,
        CURRENCY_SYMBOL
      );

      expect(userData.user).to.equal(owner.address);
      expect(userData.currency).to.equal(CURRENCY_SYMBOL);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.paymentMethods).to.deep.equal(PAYMENT_METHODS);
    });

    it("reverts if currency doesn't exist", async function () {
      const { wudbHandler, ezcrowRamp } = this;

      const currencySymbol = 'BTC';

      await expect(
        wudbHandler.updateUser(currencySymbol, TELEGRAM_HANDLE, PAYMENT_METHODS)
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsDoesNotExist'
        )
        .withArgs(currencySymbol);
    });
  });
});
