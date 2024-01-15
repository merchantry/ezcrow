const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getListingData } = require('./utils/helpers');
const { ListingAction, OrderStatus } = require('./utils/enums');

const TOKEN_NAME = 'Test Token';
const TOKEN_SYMBOL = 'TT';
const CURRENCY_DECIMALS = 3;
const TOKEN_DECIMALS = 18;
const CURRENCY_SYMBOL = 'USD';
const CURRENCIES_TO_ADD = [CURRENCY_SYMBOL, 'EUR', 'INR'];
const TOKENS_TO_ADD = [TOKEN_SYMBOL, 'ETH', 'LTC'];
const INITIAL_LISTING_ID = 220000;
const INITIAL_ORDER_ID = 480000;
const INITIAL_LISTING_IDS = [INITIAL_LISTING_ID, 510000, 760000];
const INITIAL_ORDER_IDS = [INITIAL_ORDER_ID, 330000, 110000];

describe('EzcrowRamp', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const fiatTokenPairDeployer = await ethers
      .getContractFactory('FiatTokenPairDeployer')
      .then((contract) => contract.deploy());

    const listingsHandlerDeployer = await ethers
      .getContractFactory('ListingsHandlerDeployer')
      .then((contract) => contract.deploy());

    const ordersHandlerDeployer = await ethers
      .getContractFactory('OrdersHandlerDeployer')
      .then((contract) => contract.deploy());

    const token = await ethers
      .getContractFactory('TestToken')
      .then((contract) =>
        contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS)
      );

    const ezcrowRamp = await ethers
      .getContractFactory('EzcrowRamp')
      .then((contract) =>
        contract.deploy(
          fiatTokenPairDeployer.target,
          listingsHandlerDeployer.target,
          ordersHandlerDeployer.target
        )
      );

    return { ezcrowRamp, token, owner, otherUser };
  }

  async function addCurrenciesTokensAndWhitelistUser(
    ezcrowRamp,
    currencySymbols,
    tokens,
    owner
  ) {
    const listingIds = Array.from(
      { length: currencySymbols.length },
      () => INITIAL_LISTING_ID
    );
    const orderIds = Array.from(
      { length: currencySymbols.length },
      () => INITIAL_ORDER_ID
    );

    for (const currency of currencySymbols) {
      await ezcrowRamp.addCurrencySettings(currency, CURRENCY_DECIMALS, [], []);
    }

    for (const token of tokens) {
      await ezcrowRamp.addToken(token.target, listingIds, orderIds);
    }
    await ezcrowRamp.addUserToWhitelist(owner.address);
  }

  async function setupRampAndCreateListing(
    ezcrowRamp,
    currencySymbols,
    tokens,
    owner
  ) {
    const listingData = getListingData(TOKEN_DECIMALS, CURRENCY_DECIMALS);

    await addCurrenciesTokensAndWhitelistUser(
      ezcrowRamp,
      currencySymbols,
      tokens,
      owner
    );

    await ezcrowRamp.createListing(
      TOKEN_SYMBOL,
      CURRENCY_SYMBOL,
      listingData.action,
      listingData.price,
      listingData.tokenAmount,
      listingData.max,
      listingData.min
    );

    return listingData;
  }

  async function setupRampAndCreateListingAndOrder(
    ezcrowRamp,
    currencySymbols,
    tokens,
    listingCreator,
    orderCreator
  ) {
    const listingData = await setupRampAndCreateListing(
      ezcrowRamp,
      currencySymbols,
      tokens,
      listingCreator
    );

    await ezcrowRamp
      .connect(orderCreator)
      .createOrder(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID,
        listingData.tokenAmount
      );

    return listingData;
  }

  async function setupOrderAndPutInDispute(
    ezcrowRamp,
    currencySymbols,
    tokens,
    listingCreator,
    orderCreator
  ) {
    const listingData = await setupRampAndCreateListingAndOrder(
      ezcrowRamp,
      currencySymbols,
      tokens,
      listingCreator,
      orderCreator
    );

    const users = [listingCreator, orderCreator];
    const [token] = tokens;
    const fiatTokenPairAddress = await ezcrowRamp.getFiatTokenPairAddress(
      TOKEN_SYMBOL,
      CURRENCY_SYMBOL
    );

    await token.mint(orderCreator.address, listingData.tokenAmount);
    await token
      .connect(orderCreator)
      .approve(fiatTokenPairAddress, listingData.tokenAmount);

    for (let i = 0; i < 3; i++) {
      await ezcrowRamp
        .connect(users[i % 2])
        .acceptOrder(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID);
    }

    await ezcrowRamp
      .connect(orderCreator)
      .rejectOrder(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID);

    return listingData;
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

      await ezcrowRamp.addToken(token.target, [], []);

      const [tokenAddress] = await ezcrowRamp.getAllTokenAddresses();

      expect(tokenAddress).to.equal(token.target);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, token, otherUser } = this;

      await expect(ezcrowRamp.connect(otherUser).addToken(token.target, [], []))
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if token with same symbol already exists', async function () {
      const { ezcrowRamp, token } = this;

      const newToken = await ethers
        .getContractFactory('TestToken')
        .then((contract) =>
          contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS)
        );

      await ezcrowRamp.addToken(token.target, [], []);

      await expect(ezcrowRamp.addToken(newToken.target, [], []))
        .to.be.revertedWithCustomError(ezcrowRamp, 'TokenAlreadyExists')
        .withArgs(TOKEN_SYMBOL);
    });

    it('creates fiat token pairs with all available currencies', async function () {
      const { ezcrowRamp, token } = this;

      for (const currency of CURRENCIES_TO_ADD) {
        await ezcrowRamp.addCurrencySettings(currency, CURRENCY_DECIMALS, [], []);
      }

      await ezcrowRamp.addToken(
        token.target,
        INITIAL_LISTING_IDS,
        INITIAL_ORDER_IDS
      );

      for (const currency of CURRENCIES_TO_ADD) {
        await expect(
          ezcrowRamp.getFiatTokenPairAddress(TOKEN_SYMBOL, currency)
        ).to.not.be.revertedWithCustomError(
          ezcrowRamp,
          'FiatTokenPairDoesNotExist'
        );
      }
    });

    it('reverts if invalid amount of listing ids are provided', async function () {
      const { ezcrowRamp, token } = this;

      for (const currency of CURRENCIES_TO_ADD) {
        await ezcrowRamp.addCurrencySettings(currency, CURRENCY_DECIMALS, [], []);
      }

      await expect(ezcrowRamp.addToken(token.target, [1, 2], INITIAL_ORDER_IDS))
        .to.be.revertedWithCustomError(ezcrowRamp, 'InvalidListingIdsLength')
        .withArgs(CURRENCIES_TO_ADD.length);
    });

    it('reverts if invalid amount of order ids are provided', async function () {
      const { ezcrowRamp, token } = this;

      for (const currency of CURRENCIES_TO_ADD) {
        await ezcrowRamp.addCurrencySettings(currency, CURRENCY_DECIMALS, [], []);
      }

      await expect(
        ezcrowRamp.addToken(token.target, INITIAL_LISTING_IDS, [1, 2])
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'InvalidOrderIdsLength')
        .withArgs(CURRENCIES_TO_ADD.length);
    });
  });

  describe('addCurrencySettings', function () {
    it('adds currency settings', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(
        CURRENCY_SYMBOL,
        CURRENCY_DECIMALS,
        [],
        []
      );

      const [currencySymbol] = await ezcrowRamp.getCurrencySymbols();

      expect(currencySymbol).to.equal(CURRENCY_SYMBOL);
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp
          .connect(otherUser)
          .addCurrencySettings('USD', CURRENCY_DECIMALS, [], [])
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });

    it('reverts if currency with same symbol already exists', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(
        CURRENCY_SYMBOL,
        CURRENCY_DECIMALS,
        [],
        []
      );

      await expect(
        ezcrowRamp.addCurrencySettings(CURRENCY_SYMBOL, CURRENCY_DECIMALS, [], [])
      )
        .to.be.revertedWithCustomError(
          ezcrowRamp,
          'CurrencySettingsAlreadyExists'
        )
        .withArgs(CURRENCY_SYMBOL);
    });

    it('creates fiat token pairs with all available tokens', async function () {
      const { ezcrowRamp } = this;

      for (const tokenSymbol of TOKENS_TO_ADD) {
        const newToken = await ethers
          .getContractFactory('TestToken')
          .then((contract) =>
            contract.deploy(TOKEN_NAME, tokenSymbol, TOKEN_DECIMALS)
          );

        await ezcrowRamp.addToken(newToken.target, [], []);
      }

      await ezcrowRamp.addCurrencySettings(
        CURRENCY_SYMBOL,
        CURRENCY_DECIMALS,
        INITIAL_LISTING_IDS,
        INITIAL_ORDER_IDS
      );

      for (const tokenSymbol of TOKENS_TO_ADD) {
        await expect(
          ezcrowRamp.getFiatTokenPairAddress(tokenSymbol, CURRENCY_SYMBOL)
        ).to.not.be.revertedWithCustomError(
          ezcrowRamp,
          'FiatTokenPairDoesNotExist'
        );
      }
    });

    it('reverts if invalid amount of listing ids are provided', async function () {
      const { ezcrowRamp } = this;

      for (const tokenSymbol of TOKENS_TO_ADD) {
        const newToken = await ethers
          .getContractFactory('TestToken')
          .then((contract) =>
            contract.deploy(TOKEN_NAME, tokenSymbol, TOKEN_DECIMALS)
          );

        await ezcrowRamp.addToken(newToken.target, [], []);
      }

      await expect(
        ezcrowRamp.addCurrencySettings(
          CURRENCY_SYMBOL,
          CURRENCY_DECIMALS,
          [1, 2],
          INITIAL_ORDER_IDS
        )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'InvalidListingIdsLength')
        .withArgs(TOKENS_TO_ADD.length);
    });

    it('reverts if invalid amount of order ids are provided', async function () {
      const { ezcrowRamp } = this;

      for (const tokenSymbol of TOKENS_TO_ADD) {
        const newToken = await ethers
          .getContractFactory('TestToken')
          .then((contract) =>
            contract.deploy(TOKEN_NAME, tokenSymbol, TOKEN_DECIMALS)
          );

        await ezcrowRamp.addToken(newToken.target, [], []);
      }

      await expect(
        ezcrowRamp.addCurrencySettings(
          CURRENCY_SYMBOL,
          CURRENCY_DECIMALS,
          INITIAL_LISTING_IDS,
          [1, 2]
        )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'InvalidOrderIdsLength')
        .withArgs(TOKENS_TO_ADD.length);
    });
  });

  describe('createListing', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token, owner } = this;

      await addCurrenciesTokensAndWhitelistUser(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        owner
      );

      const listingData = getListingData(TOKEN_DECIMALS, CURRENCY_DECIMALS);

      Object.assign(this, { listingData });
    });

    it('creates a listing', async function () {
      const { ezcrowRamp, owner } = this;
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

      const listing = await ezcrowRamp.getListing(
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
        .withArgs(nonWhitelistedUser.address);
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp } = this;
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
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('updateListing', function () {
    beforeEach(async function () {
      const { ezcrowRamp, owner } = this;
      const tokens = await Promise.all(
        TOKENS_TO_ADD.map((tokenSymbol) =>
          ethers
            .getContractFactory('TestToken')
            .then((contract) =>
              contract.deploy(TOKEN_NAME, tokenSymbol, TOKEN_DECIMALS)
            )
        )
      );

      const listingData = await setupRampAndCreateListing(
        ezcrowRamp,
        CURRENCIES_TO_ADD,
        tokens,
        owner
      );

      Object.assign(this, { listingData, tokens });
    });

    it('updates a listing', async function () {
      const { ezcrowRamp, owner } = this;
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

      const listing = await ezcrowRamp.getListing(
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
      const { ezcrowRamp } = this;
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
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });

    it('deletes and creates a new listing if token is changed', async function () {
      const { ezcrowRamp, owner } = this;
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

      const listingA = await ezcrowRamp.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listingB = await ezcrowRamp.getListing(
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
      const { ezcrowRamp, owner } = this;
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

      const listingA = await ezcrowRamp.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listingB = await ezcrowRamp.getListing(
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
        owner,
        tokens: [token],
      } = this;
      const { price, tokenAmount, max, min } = this.listingData;

      const newAction = ListingAction.Sell;
      const fiatTokenPairAddress = await ezcrowRamp.getFiatTokenPairAddress(
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

      const [listingA, listingB] = await ezcrowRamp.getListings(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL
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
      const { ezcrowRamp, token, owner } = this;

      await setupRampAndCreateListing(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        owner
      );
    });

    it('deletes a listing', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.deleteListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      const listing = await ezcrowRamp.getListing(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_LISTING_ID
      );

      expect(listing.isDeleted).to.be.true;
    });

    it('reverts if fiat token pair does not exist', async function () {
      const { ezcrowRamp } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.deleteListing(
          tokenSymbol,
          currencySymbol,
          INITIAL_LISTING_ID
        )
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('createOrder', function () {
    beforeEach(async function () {
      const { ezcrowRamp, token, owner } = this;

      const listingData = await setupRampAndCreateListing(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        owner
      );

      Object.assign(this, { listingData });
    });

    it('creates an order', async function () {
      const { ezcrowRamp, otherUser: orderCreator } = this;
      const { tokenAmount } = this.listingData;

      await ezcrowRamp
        .connect(orderCreator)
        .createOrder(
          TOKEN_SYMBOL,
          CURRENCY_SYMBOL,
          INITIAL_LISTING_ID,
          tokenAmount
        );

      const order = await ezcrowRamp.getOrder(
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
      const { ezcrowRamp, otherUser: orderCreator } = this;
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
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('acceptOrder', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupRampAndCreateListingAndOrder(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        listingCreator,
        orderCreator
      );
    });

    it('accepts an order', async function () {
      const { ezcrowRamp, owner: listingCreator } = this;

      await ezcrowRamp
        .connect(listingCreator)
        .acceptOrder(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID);

      const order = await ezcrowRamp.getOrder(
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
      const { ezcrowRamp, owner: listingCreator } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp
          .connect(listingCreator)
          .acceptOrder(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('rejectOrder', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupRampAndCreateListingAndOrder(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        listingCreator,
        orderCreator
      );
    });

    it('rejects an order', async function () {
      const { ezcrowRamp, owner: listingCreator } = this;

      await ezcrowRamp
        .connect(listingCreator)
        .rejectOrder(TOKEN_SYMBOL, CURRENCY_SYMBOL, INITIAL_ORDER_ID);

      const order = await ezcrowRamp.getOrder(
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
      const { ezcrowRamp, owner: listingCreator } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp
          .connect(listingCreator)
          .rejectOrder(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('acceptDispute', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupOrderAndPutInDispute(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        listingCreator,
        orderCreator
      );
    });

    it('accepts a dispute and cancels the order', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.acceptDispute(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      const order = await ezcrowRamp.getOrder(
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
      const { ezcrowRamp } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.acceptDispute(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('rejectDispute', function () {
    beforeEach(async function () {
      const {
        ezcrowRamp,
        token,
        owner: listingCreator,
        otherUser: orderCreator,
      } = this;

      await setupOrderAndPutInDispute(
        ezcrowRamp,
        [CURRENCY_SYMBOL],
        [token],
        listingCreator,
        orderCreator
      );
    });

    it('rejects a dispute and completes the order', async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.rejectDispute(
        TOKEN_SYMBOL,
        CURRENCY_SYMBOL,
        INITIAL_ORDER_ID
      );

      const order = await ezcrowRamp.getOrder(
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
      const { ezcrowRamp } = this;

      const tokenSymbol = 'BTC';
      const currencySymbol = 'AUD';

      await expect(
        ezcrowRamp.rejectDispute(tokenSymbol, currencySymbol, INITIAL_ORDER_ID)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'FiatTokenPairDoesNotExist')
        .withArgs(tokenSymbol, currencySymbol);
    });
  });

  describe('addUserToWhitelist', function () {
    it('adds user to whitelist', async function () {
      const { ezcrowRamp, otherUser } = this;

      await ezcrowRamp.addUserToWhitelist(otherUser.address);

      const isWhitelisted = await ezcrowRamp.isWhitelisted(otherUser.address);

      expect(isWhitelisted).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp.connect(otherUser).addUserToWhitelist(otherUser.address)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });
  });

  describe('removeUserFromWhiteList', function () {
    beforeEach(async function () {
      const { ezcrowRamp, otherUser } = this;

      await ezcrowRamp.addUserToWhitelist(otherUser.address);
    });
    it('adds user to whitelist', async function () {
      const { ezcrowRamp, otherUser } = this;

      await ezcrowRamp.removeUserFromWhiteList(otherUser.address);

      const isWhitelisted = await ezcrowRamp.isWhitelisted(otherUser.address);

      expect(isWhitelisted).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { ezcrowRamp, otherUser } = this;

      await expect(
        ezcrowRamp.connect(otherUser).removeUserFromWhiteList(otherUser.address)
      )
        .to.be.revertedWithCustomError(ezcrowRamp, 'OwnableUnauthorizedAccount')
        .withArgs(otherUser.address);
    });
  });

  describe('setCurrencyDecimals', function () {
    beforeEach(async function () {
      const { ezcrowRamp } = this;

      await ezcrowRamp.addCurrencySettings(
        CURRENCY_SYMBOL,
        CURRENCY_DECIMALS,
        [],
        []
      );
    });

    it('updates currency decimals', async function () {
      const { ezcrowRamp } = this;

      const newCurrencyDecimals = 2;

      await ezcrowRamp.setCurrencyDecimals(CURRENCY_SYMBOL, newCurrencyDecimals);

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
