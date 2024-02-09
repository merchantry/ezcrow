const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getListingData } = require('./utils/helpers');
const { ListingAction, OrderStatus } = require('./utils/enums');
const { signData } = require('./utils/signature');
const {
  addCurrenciesTokensAndWhitelistUser,
  setupRampAndCreateListing,
  setupRampAndCreateListingAndOrder,
  setupOrderAndPutInDispute,
} = require('./utils/setups');

const TOKEN_NAME = 'Test Token';
const TOKEN_SYMBOL = 'TT';
const CURRENCY_DECIMALS = 3;
const TOKEN_DECIMALS = 18;
const CURRENCY_SYMBOL = 'USD';
const CURRENCIES_TO_ADD = [CURRENCY_SYMBOL, 'EUR', 'INR'];
const TOKENS_TO_ADD = [TOKEN_SYMBOL, 'ETH', 'LTC'];
const INITIAL_LISTING_ID = 220000;
const INITIAL_ORDER_ID = 480000;
const MAX_ITEMS = 100;

describe('EzcrowRamp', function () {
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

    const wudb = await ethers
      .getContractFactory('WhitelistedUsersDatabase')
      .then(contract => contract.deploy(owner.address));

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

    const ezcrowRampQuery = await ethers
      .getContractFactory('EzcrowRampQuery')
      .then(contract => contract.deploy(fiatTokenPairHandler.target));

    return {
      ezcrowRamp,
      ezcrowRampQuery,
      fiatTokenPairHandler,
      wudb,
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
      const { ezcrowRamp } = this;

      expect(ezcrowRamp.target).not.to.be.undefined;
    });
  });

  describe('addToken', function () {
    it('adds token', async function () {
      const { ezcrowRamp, token } = this;

      await ezcrowRamp.addToken(token.target);

      const [tokenAddress] = await ezcrowRamp.getAllTokenAddresses();

      expect(tokenAddress).to.equal(token.target);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, token, otherUser } = this;

      await expect(ezcrowRamp.connect(otherUser).addToken(token.target))
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if token with same symbol already exists', async function () {
      const { ezcrowRamp, token } = this;

      const newToken = await ethers
        .getContractFactory('TestToken')
        .then(contract =>
          contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS)
        );

      await ezcrowRamp.addToken(token.target);

      await expect(ezcrowRamp.addToken(newToken.target))
        .to.be.revertedWithCustomError(ezcrowRamp, 'TokenAlreadyExists')
        .withArgs(TOKEN_SYMBOL);
    });
  });

  describe('addCurrencySettings', function () {
    it('adds currency settings', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);

      const [currencySymbol] = await ezcrowRamp.getCurrencySymbols();

      expect(currencySymbol).to.equal(CURRENCY_SYMBOL);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .addCurrencySettings('USD', CURRENCY_DECIMALS)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if currency with same symbol already exists', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);

      await expect(
        ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS)
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsAlreadyExists'
        )
        .withArgs(CURRENCY_SYMBOL);
    });
  });

  describe('connectFiatTokenPair', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
      await ezcrowRamp.addToken(token.target);
    });

    it('connects fiat token pair', async function () {
      const { ezcrowRamp, fiatTokenPairHandler } = this;

      await ezcrowRamp.connectFiatTokenPair(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        INITIAL_ORDER_ID
      );

      const fiatTokenPairAddress =
        await fiatTokenPairHandler.getFiatTokenPairAddress(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL
        );

      expect(fiatTokenPairAddress).not.to.be.undefined;
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .connectFiatTokenPair(
            TOKEN_SYMBOL,
            CURRENCY_SYMBOL,
            INITIAL_LISTING_ID,
            INITIAL_ORDER_ID
          )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if token does not exist', async function () {
      const { ezcrowRamp } = this;

      const tokenSymbol = 'BTC';

      await expect(
        ezcrowRamp.connectFiatTokenPair(
          tokenSymbol,
          CURRENCY_SYMBOL,
          INITIAL_LISTING_ID,
          INITIAL_ORDER_ID
        )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'TokenDoesNotExist')
        .withArgs(tokenSymbol);
    });

    it('reverts if currency settings do not exist', async function () {
      const { ezcrowRamp } = this;

      const currencySymbol = 'BTC';

      await expect(
        ezcrowRamp.connectFiatTokenPair(
          TOKEN_SYMBOL,
          currencySymbol,
          INITIAL_LISTING_ID,
          INITIAL_ORDER_ID
        )
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsDoesNotExist'
        )
        .withArgs(currencySymbol);
    });

    it('reverts if fiat token pair already exists', async function () {
      const { ezcrowRamp, fiatTokenPairHandler, token } = this;

      const currencySettingsAddress =
        await ezcrowRamp.getCurrencySettingsAddress(CURRENCY_SYMBOL);

      await ezcrowRamp.connectFiatTokenPair(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        INITIAL_ORDER_ID
      );

      await expect(
        ezcrowRamp.connectFiatTokenPair(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_LISTING_ID,
          INITIAL_ORDER_ID
        )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairAlreadyExists'
        )
        .withArgs(token.target, currencySettingsAddress);
    });
  });

  describe('createListing', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token, owner, wudb } = this;

      await addCurrenciesTokensAndWhitelistUser({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });

      const listingData = getListingData(TOKEN_DECIMALS, CURRENCY_DECIMALS);

      Object.assign(this, { listingData });
    });

    it('creates a listing', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      await ezcrowRamp.createListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        action,
        price,
        tokenAmount,
        max,
        min
      );

      const listing = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      expect(listing.id).to.equal(INITIAL_LISTING_ID);
      expect(listing.action).to.equal(action);
      expect(listing.price).to.equal(price);
      expect(listing.totalTokenAmount).to.equal(tokenAmount);
      expect(listing.availableTokenAmount).to.equal(tokenAmount);
      expect(listing.minPricePerOrder).to.equal(min);
      expect(listing.maxPricePerOrder).to.equal(max);
      expect(listing.creator).to.equal(owner.address);
      expect(listing.isDeleted).to.be.false;
    });

    it('reverts if user is not whitelisted', async function () {
      const { ezcrowRamp, otherUser: nonWhitelistedUser } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      await expect(
        ezcrowRamp
          .connect(nonWhitelistedUser)
          .createListing(
            TOKEN_SYMBOL,
            CURRENCY_SYMBOL,
            action,
            price,
            tokenAmount,
            max,
            min
          )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'UserNotWhitelisted')
        .withArgs(nonWhitelistedUser.address, CURRENCY_SYMBOL);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, owner } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.createListing(
          tokenSymbol,
          currencySymbol,
          action,
          price,
          tokenAmount,
          max,
          min
        )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'UserNotWhitelisted')
        .withArgs(owner.address, currencySymbol);
    });
  });

  describe('updateListing', function () {
    beforeEach(async function () {
      const { ezcrowRamp, owner, wudb } = this;
      const tokens = await Promise.all(
        TOKENS_TO_ADD.map(tokenSymbol =>
          ethers
            .getContractFactory('TestToken')
            .then(contract =>
              contract.deploy(TOKEN_NAME, tokenSymbol, TOKEN_DECIMALS)
            )
        )
      );

      const listingData = await setupRampAndCreateListing({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: CURRENCIES_TO_ADD,
        tokens,
        owner,
        currencySymbol: CURRENCY_SYMBOL,
        tokenSymbol: TOKEN_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });

      Object.assign(this, { listingData, tokens });
    });

    it('updates a listing', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner } = this;
      const { price, tokenAmount, max, min } = this.listingData;

      const newAction = ListingAction.Buy;
      const newPrice = price * 2n;
      const newTokenAmount = tokenAmount * 2n;
      const newMax = max * 2n;
      const newMin = min * 2n;

      await ezcrowRamp.updateListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        newAction,
        newPrice,
        newTokenAmount,
        newMax,
        newMin
      );

      const listing = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      expect(listing.id).to.equal(INITIAL_LISTING_ID);
      expect(listing.action).to.equal(newAction);
      expect(listing.price).to.equal(newPrice);
      expect(listing.totalTokenAmount).to.equal(newTokenAmount);
      expect(listing.availableTokenAmount).to.equal(newTokenAmount);
      expect(listing.minPricePerOrder).to.equal(newMin);
      expect(listing.maxPricePerOrder).to.equal(newMax);
      expect(listing.creator).to.equal(owner.address);
      expect(listing.isDeleted).to.be.false;
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      const newTokenAmount = tokenAmount * 2n;

      await expect(
        ezcrowRamp.updateListing(
          tokenSymbol,
          currencySymbol,
          INITIAL_LISTING_ID,
          tokenSymbol,
          currencySymbol,
          action,
          price,
          newTokenAmount,
          max,
          min
        )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });

    it('deletes and creates a new listing if token is changed', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      const newTokenSymbol = TOKENS_TO_ADD[1];

      await ezcrowRamp.updateListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        newTokenSymbol,
        CURRENCY_SYMBOL,
        action,
        price,
        tokenAmount,
        max,
        min
      );

      const listingA = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listingB = await ezcrowRampQuery.getListing(
        newTokenSymbol,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      expect(listingA.isDeleted).to.be.true;

      expect(listingB.id).to.equal(INITIAL_LISTING_ID);
      expect(listingB.action).to.equal(action);
      expect(listingB.price).to.equal(price);
      expect(listingB.totalTokenAmount).to.equal(tokenAmount);
      expect(listingB.availableTokenAmount).to.equal(tokenAmount);
      expect(listingB.minPricePerOrder).to.equal(min);
      expect(listingB.maxPricePerOrder).to.equal(max);
      expect(listingB.creator).to.equal(owner.address);
      expect(listingB.isDeleted).to.be.false;
    });

    it('deletes and creates a new listing if currency is changed', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner } = this;
      const { action, price, tokenAmount, max, min } = this.listingData;

      const newCurrencySymbol = CURRENCIES_TO_ADD[1];

      await ezcrowRamp.updateListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        TOKEN_SYMBOL,
        newCurrencySymbol,
        action,
        price,
        tokenAmount,
        max,
        min
      );

      const listingA = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listingB = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        newCurrencySymbol,
        INITIAL_LISTING_ID
      );

      expect(listingA.isDeleted).to.be.true;

      expect(listingB.id).to.equal(INITIAL_LISTING_ID);
      expect(listingB.action).to.equal(action);
      expect(listingB.price).to.equal(price);
      expect(listingB.totalTokenAmount).to.equal(tokenAmount);
      expect(listingB.availableTokenAmount).to.equal(tokenAmount);
      expect(listingB.minPricePerOrder).to.equal(min);
      expect(listingB.maxPricePerOrder).to.equal(max);
      expect(listingB.creator).to.equal(owner.address);
      expect(listingB.isDeleted).to.be.false;
    });

    it('deletes and creates a new listing if action is changed', async function () {
      const {
        ezcrowRamp,
        ezcrowRampQuery,
        fiatTokenPairHandler,
        owner,
        tokens: [token],
      } = this;
      const { price, tokenAmount, max, min } = this.listingData;

      const newAction = ListingAction.Sell;
      const fiatTokenPairAddress =
        await fiatTokenPairHandler.getFiatTokenPairAddress(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL
        );

      await token.mint(owner.address, tokenAmount);
      await token.approve(fiatTokenPairAddress, tokenAmount);
      await ezcrowRamp.updateListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        newAction,
        price,
        tokenAmount,
        max,
        min
      );

      const [listingA, listingB] = await ezcrowRampQuery.getListings(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        MAX_ITEMS
      );

      expect(listingA.isDeleted).to.be.true;

      expect(listingB.id).to.equal(INITIAL_LISTING_ID + 1);
      expect(listingB.action).to.equal(newAction);
      expect(listingB.price).to.equal(price);
      expect(listingB.totalTokenAmount).to.equal(tokenAmount);
      expect(listingB.availableTokenAmount).to.equal(tokenAmount);
      expect(listingB.minPricePerOrder).to.equal(min);
      expect(listingB.maxPricePerOrder).to.equal(max);
      expect(listingB.creator).to.equal(owner.address);
      expect(listingB.isDeleted).to.be.false;
    });
  });

  describe('deleteListing', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token, owner, wudb } = this;

      await setupRampAndCreateListing({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });
    });

    it('deletes a listing', async function () {
      const { ezcrowRamp, ezcrowRampQuery } = this;

      await ezcrowRamp.deleteListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listing = await ezcrowRampQuery.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      expect(listing.isDeleted).to.be.true;
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.deleteListing(
          tokenSymbol,
          currencySymbol,
          INITIAL_LISTING_ID
        )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('createOrder', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token, owner, wudb } = this;

      const listingData = await setupRampAndCreateListing({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });

      Object.assign(this, { listingData });
    });

    it('creates an order', async function () {
      const { ezcrowRamp, ezcrowRampQuery, otherUser: orderCreator } = this;
      const { tokenAmount } = this.listingData;

      await ezcrowRamp
        .connect(orderCreator)
        .createOrder(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_LISTING_ID,
          tokenAmount
        );

      const order = await ezcrowRampQuery.getOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(order.id).to.equal(INITIAL_ORDER_ID);
      expect(order.listingId).to.equal(INITIAL_LISTING_ID);
      expect(order.tokenAmount).to.equal(tokenAmount);
      expect(order.statusHistory).to.deep.equal([OrderStatus.RequestSent]);
      expect(order.creator).to.equal(orderCreator.address);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const {
        ezcrowRamp,
        fiatTokenPairHandler,
        otherUser: orderCreator,
      } = this;
      const { tokenAmount } = this.listingData;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp
          .connect(orderCreator)
          .createOrder(
            tokenSymbol,
            currencySymbol,
            INITIAL_LISTING_ID,
            tokenAmount
          )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('acceptOrder', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        wudb,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupRampAndCreateListingAndOrder({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner: listingCreator,
        listingCreator,
        orderCreator,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });
    });

    it('accepts an order', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner: listingCreator } = this;

      const { v, r, s } = await signData(listingCreator, ezcrowRamp, {
        owner: listingCreator.address,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        orderId: INITIAL_ORDER_ID,
        accept: true,
        nonce: 0,
      });

      await ezcrowRamp.acceptOrder(
        listingCreator.address,
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID,
        v,
        r,
        s
      );

      const order = await ezcrowRampQuery.getOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(order.statusHistory).to.deep.equal([
        OrderStatus.RequestSent,
        OrderStatus.AssetsConfirmed,
      ]);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler, owner: listingCreator } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      const { v, r, s } = await signData(listingCreator, ezcrowRamp, {
        owner: listingCreator.address,
        tokenSymbol,
        currencySymbol,
        orderId: INITIAL_ORDER_ID,
        accept: true,
        nonce: 0,
      });

      await expect(
        ezcrowRamp.acceptOrder(
          listingCreator.address,
          tokenSymbol,
          currencySymbol,
          INITIAL_ORDER_ID,
          v,
          r,
          s
        )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('rejectOrder', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        wudb,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupRampAndCreateListingAndOrder({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner: listingCreator,
        listingCreator,
        orderCreator,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });
    });

    it('rejects an order', async function () {
      const { ezcrowRamp, ezcrowRampQuery, owner: listingCreator } = this;

      const { v, r, s } = await signData(listingCreator, ezcrowRamp, {
        owner: listingCreator.address,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        orderId: INITIAL_ORDER_ID,
        accept: false,
        nonce: 0,
      });

      await ezcrowRamp.rejectOrder(
        listingCreator,
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID,
        v,
        r,
        s
      );

      const order = await ezcrowRampQuery.getOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(order.statusHistory).to.deep.equal([
        OrderStatus.RequestSent,
        OrderStatus.Cancelled,
      ]);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler, owner: listingCreator } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      const { v, r, s } = await signData(listingCreator, ezcrowRamp, {
        owner: listingCreator.address,
        tokenSymbol,
        currencySymbol,
        orderId: INITIAL_ORDER_ID,
        accept: false,
        nonce: 0,
      });

      await expect(
        ezcrowRamp.rejectOrder(
          listingCreator.address,
          tokenSymbol,
          currencySymbol,
          INITIAL_ORDER_ID,
          v,
          r,
          s
        )
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('acceptDispute', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        fiatTokenPairHandler,
        wudb,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupOrderAndPutInDispute({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        fiatTokenPairHandler,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner: listingCreator,
        listingCreator,
        orderCreator,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });
    });

    it('accepts a dispute and cancels the order', async function () {
      const { ezcrowRamp, ezcrowRampQuery } = this;

      await ezcrowRamp.acceptDispute(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      const order = await ezcrowRampQuery.getOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(order.statusHistory).to.deep.equal([
        OrderStatus.RequestSent,
        OrderStatus.AssetsConfirmed,
        OrderStatus.TokensDeposited,
        OrderStatus.PaymentSent,
        OrderStatus.InDispute,
        OrderStatus.Cancelled,
      ]);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .acceptDispute(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.acceptDispute(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('rejectDispute', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        fiatTokenPairHandler,
        wudb,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupOrderAndPutInDispute({
        ezcrowRamp,
        whitelistedUsersDatabase: wudb,
        fiatTokenPairHandler,
        currencySymbols: [CURRENCY_SYMBOL],
        tokens: [token],
        owner: listingCreator,
        listingCreator,
        orderCreator,
        tokenSymbol: TOKEN_SYMBOL,
        currencySymbol: CURRENCY_SYMBOL,
        tokenDecimals: TOKEN_DECIMALS,
        currencyDecimals: CURRENCY_DECIMALS,
        initialListingId: INITIAL_LISTING_ID,
        initialOrderId: INITIAL_ORDER_ID,
      });
    });

    it('rejects a dispute and completes the order', async function () {
      const { ezcrowRamp, ezcrowRampQuery } = this;

      await ezcrowRamp.rejectDispute(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      const order = await ezcrowRampQuery.getOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      expect(order.statusHistory).to.deep.equal([
        OrderStatus.RequestSent,
        OrderStatus.AssetsConfirmed,
        OrderStatus.TokensDeposited,
        OrderStatus.PaymentSent,
        OrderStatus.InDispute,
        OrderStatus.Completed,
      ]);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .rejectDispute(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp, fiatTokenPairHandler } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.rejectDispute(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(
          fiatTokenPairHandler,
          'FiatTokenPairDoesNotExist'
        )
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('setCurrencyDecimals', function () {
    beforeEach(async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS);
    });

    it('updates currency decimals', async function () {
      const { ezcrowRamp } = this;

      const newCurrencyDecimals = 2;

      await ezcrowRamp.setCurrencyDecimals(
        CURRENCY_SYMBOL,
        newCurrencyDecimals
      );

      const currencyDecimals =
        await ezcrowRamp.getCurrencyDecimals(CURRENCY_SYMBOL);

      expect(currencyDecimals).to.equal(newCurrencyDecimals);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      const newCurrencyDecimals = 2;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .setCurrencyDecimals(CURRENCY_SYMBOL, newCurrencyDecimals)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if currency settings do not exist', async function () {
      const { ezcrowRamp } = this;

      const currencySymbol = 'BTC';

      await expect(
        ezcrowRamp.setCurrencyDecimals(currencySymbol, CURRENCY_DECIMALS)
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsDoesNotExist'
        )
        .withArgs(currencySymbol);
    });
  });
});
