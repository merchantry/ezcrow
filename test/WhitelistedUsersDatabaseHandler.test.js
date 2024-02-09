const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { signData } = require('./utils/signature');
const { setupRampAndCreateListingAndOrder } = require('./utils/setups');

const TOKEN_NAME = 'Test Token';
const TOKEN_SYMBOL = 'TT';
const CURRENCY_DECIMALS = 3;
const TOKEN_DECIMALS = 18;
const CURRENCY_SYMBOL = 'USD';
const INITIAL_LISTING_ID = 100000;
const INITIAL_ORDER_ID = 480000;
const TELEGRAM_HANDLE = 'userA_telegram';
const PAYMENT_METHOD = 'PayPal';
const PAYMENT_DATA = 'userA_paypal@example.com';

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

      await wudbHandler.addValidPaymentMethod(PAYMENT_METHOD);

      const isValidPaymentMethod =
        await wudbHandler.isValidPaymentMethod(PAYMENT_METHOD);

      expect(isValidPaymentMethod).to.be.true;
    });

    it('adds payment methods to a list', async function () {
      const { wudbHandler } = this;

      const paymentMethodsToAdd = ['PayPal', 'Bank Transfer', 'Cash'];

      for (const paymentMethod of paymentMethodsToAdd) {
        await wudbHandler.addValidPaymentMethod(paymentMethod);
      }

      const paymentMethods = await wudbHandler.getAllValidPaymentMethods();

      expect(paymentMethods).to.deep.equal(paymentMethodsToAdd);
    });

    it('reverts if not accessed by owner', async function () {
      const { wudbHandler, otherUser } = this;

      await expect(
        wudbHandler.connect(otherUser).addValidPaymentMethod(PAYMENT_METHOD)
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
      await wudbHandler.addValidPaymentMethod(PAYMENT_METHOD);
    });

    it('updates user prepared data', async function () {
      const { wudbHandler, owner } = this;

      await wudbHandler.updateUser(
        CURRENCY_SYMBOL,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );

      const userData = await wudbHandler.getUserPreparedData(
        owner.address,
        CURRENCY_SYMBOL
      );

      expect(userData.user).to.equal(owner.address);
      expect(userData.currency).to.equal(CURRENCY_SYMBOL);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
      expect(userData.whitelisted).to.be.false;
    });

    it("reverts if currency doesn't exist", async function () {
      const { wudbHandler, ezcrowRamp } = this;

      const currencySymbol = 'BTC';

      await expect(
        wudbHandler.updateUser(
          currencySymbol,
          TELEGRAM_HANDLE,
          PAYMENT_METHOD,
          PAYMENT_DATA
        )
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsDoesNotExist'
        )
        .withArgs(currencySymbol);
    });
  });

  describe('getUserData', function () {
    beforeEach(async function () {
      const { wudbHandler, ezcrowRamp, otherUser } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
      await wudbHandler.addValidPaymentMethod(PAYMENT_METHOD);
      await wudbHandler
        .connect(otherUser)
        .updateUser(
          CURRENCY_SYMBOL,
          TELEGRAM_HANDLE,
          PAYMENT_METHOD,
          PAYMENT_DATA
        );
      await wudbHandler.whitelistUser(otherUser.address, CURRENCY_SYMBOL);
    });

    it('hides private data if accessed by another non-owner user', async function () {
      const { wudbHandler, otherUser, userA } = this;

      const userData = await wudbHandler
        .connect(userA)
        .getUserData(otherUser.address, CURRENCY_SYMBOL);

      expect(userData.privateData.paymentMethod).to.equal('');
      expect(userData.privateData.paymentData).to.equal('');
    });

    it('shows private data if accessed by the user themselves', async function () {
      const { wudbHandler, otherUser } = this;

      const userData = await wudbHandler
        .connect(otherUser)
        .getUserData(otherUser.address, CURRENCY_SYMBOL);

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('shows private data if accessed by owner', async function () {
      const { wudbHandler, owner, otherUser } = this;

      const userData = await wudbHandler
        .connect(owner)
        .getUserData(otherUser.address, CURRENCY_SYMBOL);

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });
  });

  describe('getUserPreparedData', function () {
    beforeEach(async function () {
      const { wudbHandler, ezcrowRamp, otherUser } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
      await wudbHandler.addValidPaymentMethod(PAYMENT_METHOD);
      await wudbHandler
        .connect(otherUser)
        .updateUser(
          CURRENCY_SYMBOL,
          TELEGRAM_HANDLE,
          PAYMENT_METHOD,
          PAYMENT_DATA
        );
    });

    it('shows data if accessed by the user themselves', async function () {
      const { wudbHandler, otherUser } = this;

      const userData = await wudbHandler
        .connect(otherUser)
        .getUserPreparedData(otherUser.address, CURRENCY_SYMBOL);

      expect(userData.profileNonce).to.equal(1);
    });

    it('shows data if accessed by owner', async function () {
      const { wudbHandler, owner, otherUser } = this;

      const userData = await wudbHandler
        .connect(owner)
        .getUserPreparedData(otherUser.address, CURRENCY_SYMBOL);

      expect(userData.profileNonce).to.equal(1);
    });

    it('reverts if not accessed by owner or user', async function () {
      const { wudbHandler, otherUser, userA } = this;

      await expect(
        wudbHandler
          .connect(userA)
          .getUserPreparedData(otherUser.address, CURRENCY_SYMBOL)
      ).to.be.revertedWithCustomError(wudbHandler, 'UserNotAuthorized');
    });
  });

  describe('getUserDataWithOrder', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        fiatTokenPairHandler,
        wudbHandler,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      const { tokenAmount } = await setupRampAndCreateListingAndOrder({
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        ezcrowRamp,
        owner: listingCreator,
        listingCreator,
        orderCreator,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
        whitelistedUsersDatabase: wudbHandler,
      });

      await wudbHandler.addValidPaymentMethod(PAYMENT_METHOD);
      await wudbHandler
        .connect(listingCreator)
        .updateUser(
          CURRENCY_SYMBOL,
          TELEGRAM_HANDLE,
          PAYMENT_METHOD,
          PAYMENT_DATA
        );
      await wudbHandler.whitelistUser(listingCreator.address, CURRENCY_SYMBOL);

      const fiatTokenPairAddress =
        await fiatTokenPairHandler.getFiatTokenPairAddress(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL
        );

      const advanceOrder = async count => {
        const users = [listingCreator, orderCreator];
        await token.mint(orderCreator.address, tokenAmount);
        await token
          .connect(orderCreator)
          .approve(fiatTokenPairAddress, tokenAmount);

        for (let i = 0; i < count; i++) {
          const user = users[i % 2];
          const nonce = await ezcrowRamp.nonces(user.address);
          const { v, r, s } = await signData(user, ezcrowRamp, {
            owner: user.address,
            tokenSymbol: TOKEN_SYMBOL,
            currencySymbol: CURRENCY_SYMBOL,
            orderId: INITIAL_ORDER_ID,
            accept: true,
            nonce,
          });

          await ezcrowRamp.acceptOrder(
            user.address,
            TOKEN_SYMBOL,
            CURRENCY_SYMBOL,
            INITIAL_ORDER_ID,
            v,
            r,
            s
          );
        }
      };

      const rejectOrder = async user => {
        const nonce = await ezcrowRamp.nonces(user.address);
        const { v, r, s } = await signData(user, ezcrowRamp, {
          owner: user.address,
          tokenSymbol: TOKEN_SYMBOL,
          currencySymbol: CURRENCY_SYMBOL,
          orderId: INITIAL_ORDER_ID,
          accept: false,
          nonce,
        });

        await ezcrowRamp.rejectOrder(
          user.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID,
          v,
          r,
          s
        );
      };

      Object.assign(this, { advanceOrder, rejectOrder });
    });

    it('hides data if order status is RequestSent', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal('');
      expect(userData.privateData.paymentData).to.equal('');
    });

    it('shows data if order status is AssetsConfirmed', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        advanceOrder,
      } = this;

      await advanceOrder(1);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('shows data if order status is TokensDeposited', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        advanceOrder,
      } = this;

      await advanceOrder(2);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('shows data if order status is PaymentSent', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        advanceOrder,
      } = this;

      await advanceOrder(3);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('hides data if order is completed', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        advanceOrder,
      } = this;

      await advanceOrder(4);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal('');
      expect(userData.privateData.paymentData).to.equal('');
    });

    it('hides data if order is cancelled', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        rejectOrder,
      } = this;

      await rejectOrder(listingCreator);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal('');
      expect(userData.privateData.paymentData).to.equal('');
    });

    it('shows data if order is in dispute', async function () {
      const {
        wudbHandler,
        owner: listingCreator,
        otherUser: orderCreator,
        advanceOrder,
        rejectOrder,
      } = this;

      await advanceOrder(3);
      await rejectOrder(orderCreator);

      const userData = await wudbHandler
        .connect(orderCreator)
        .getUserDataWithOrder(
          listingCreator.address,
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_ORDER_ID
        );

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('shows data if accessed by owner', async function () {
      const { wudbHandler, owner: listingCreator } = this;

      const userData = await wudbHandler.getUserDataWithOrder(
        listingCreator.address,
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });
  });
});
