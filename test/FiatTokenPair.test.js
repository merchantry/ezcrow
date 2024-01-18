const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  multiplyByTenPow,
  getOrderCurrentStatus,
  findObjectKeyByValue,
  getListingData,
} = require('./utils/helpers');
const { orderStruct, listingStruct } = require('./utils/eventArgsMatches');
const {
  ListingAction,
  OrderStatus,
  ListingsFilter,
  ListingsSortBy,
  SortDirection,
} = require('./utils/enums');

const TOKEN_NAME = 'Test Token';
const TOKEN_SYMBOL = 'TT';
const TOKEN_DECIMALS = 18;
const CURRENCY_DECIMALS = 3;
const INITIAL_LISTING_ID = 1;
const INITIAL_ORDER_ID = 2;
const anyValue = () => true;

describe('FiatTokenPair', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const token = await ethers
      .getContractFactory('TestToken')
      .then((contract) =>
        contract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS)
      );

    await token.mint(owner.address, multiplyByTenPow(100000n, TOKEN_DECIMALS));

    const currencySettings = await ethers
      .getContractFactory('CurrencySettings')
      .then((contract) => contract.deploy('USD', CURRENCY_DECIMALS));

    const fiatTokenPair = await ethers
      .getContractFactory('FiatTokenPair')
      .then((contract) =>
        contract.deploy(
          'TT/USD',
          token.target,
          currencySettings.target,
          owner.address
        )
      );

    const listingsHandler = await ethers
      .getContractFactory('ListingsHandler')
      .then((contract) =>
        contract.deploy(owner.address, fiatTokenPair.target, INITIAL_LISTING_ID)
      );

    const ordersHandler = await ethers
      .getContractFactory('OrdersHandler')
      .then((contract) =>
        contract.deploy(owner.address, fiatTokenPair.target, INITIAL_ORDER_ID)
      );

    await fiatTokenPair.setListingsHandler(listingsHandler.target);
    await fiatTokenPair.setOrdersHandler(ordersHandler.target);

    const listingData = getListingData(TOKEN_DECIMALS, CURRENCY_DECIMALS);

    return {
      fiatTokenPair,
      listingsHandler,
      ordersHandler,
      token,
      currencySettings,
      owner,
      otherUser,
      listingData,
    };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { fiatTokenPair } = await loadFixture(deployFixture);

      expect(fiatTokenPair.target).not.to.be.undefined;
    });
  });

  describe('ListingsHandler', function () {
    describe('createListing', function () {
      it('creates a listing', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        await listingsHandler.createListing(
          action,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );

        const listing = await listingsHandler.getListing(1);

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

      it('reverts if not accessed by owner', async function () {
        const { listingsHandler, owner, otherUser } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        await expect(
          listingsHandler
            .connect(otherUser)
            .createListing(action, price, tokenAmount, min, max, owner.address)
        )
          .to.be.revertedWithCustomError(
            listingsHandler,
            'OwnableUnauthorizedAccount'
          )
          .withArgs(otherUser.address);
      });

      it('emits an event', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        await expect(
          listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.emit(listingsHandler, 'ListingCreated')
          .withArgs(
            listingStruct({
              id: INITIAL_LISTING_ID,
              action,
              price,
              totalTokenAmount: tokenAmount,
              availableTokenAmount: tokenAmount,
              minPricePerOrder: min,
              maxPricePerOrder: max,
              creator: owner.address,
              isDeleted: false,
            })
          );
      });

      it('increments listing id', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const args = [action, price, tokenAmount, min, max, owner.address];

        await listingsHandler.createListing(...args);
        await listingsHandler.createListing(...args);

        const listings = await listingsHandler.getListings();

        expect(listings[0].id).to.equal(INITIAL_LISTING_ID);
        expect(listings[1].id).to.equal(INITIAL_LISTING_ID + 1);
      });

      it('reverts if minimum price per order is zero', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const { action, price, tokenAmount, max } = this.listingData;

        await expect(
          listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            0,
            max,
            owner.address
          )
        ).to.be.revertedWithCustomError(
          fiatTokenPair,
          'ListingMinPerOrderIsZero'
        );
      });

      it('reverts if minimum price per order is greater than maximum price per order', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const { action, price, tokenAmount, max } = this.listingData;

        const min = max + 1n;

        await expect(
          listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingMinPerOrderGreaterThanMaxPerOrder'
          )
          .withArgs(min, max);
      });

      it('reverts if the maximum price per order is greater than total price', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const {
          action,
          price,
          tokenAmount,
          min,
          max: totalPrice,
        } = this.listingData;

        const max = totalPrice + 1n;

        await expect(
          listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingMaxPerOrderGreaterThanTotalPrice'
          )
          .withArgs(max, totalPrice);
      });

      it('transfers tokens from the listing creator on sell listing', async function () {
        const { fiatTokenPair, listingsHandler, owner, token } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await token.approve(fiatTokenPair.target, tokenAmount);

        await expect(
          listingsHandler.createListing(
            ListingAction.Sell,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        ).to.changeTokenBalances(
          token,
          [owner, fiatTokenPair],
          [-tokenAmount, tokenAmount]
        );
      });

      it('keeps listings under creator key', async function () {
        const { listingsHandler, owner: userA, otherUser: userB } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingsData = [
          { user: userA, numOfListings: 3 },
          { user: userB, numOfListings: 2 },
        ];

        listingsData.forEach(async ({ user, numOfListings }) => {
          for (let i = 0; i < numOfListings; i++) {
            await listingsHandler.createListing(
              action,
              price,
              tokenAmount,
              min,
              max,
              user.address
            );
          }
        });

        listingsData.forEach(async ({ user, numOfListings }) => {
          const listings = await listingsHandler.getUserListings(user.address);

          expect(listings).to.have.lengthOf(numOfListings);
        });
      });

      it('keeps listings price key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingPrices = [price * 2n, price, price * 4n, price * 3n];

        for (const listingPrice of listingPrices) {
          await listingsHandler.createListing(
            action,
            listingPrice,
            tokenAmount,
            min,
            max,
            owner.address
          );
        }

        const listings = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.Price,
          SortDirection.Asc,
          0,
          100,
          100
        );

        for (let i = 0; i < listings.length - 1; i++) {
          expect(listings[i].price).to.be.lte(listings[i + 1].price);
        }
      });

      it('keeps listings available amount key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingTokenAmounts = [
          tokenAmount * 2n,
          tokenAmount,
          tokenAmount * 4n,
          tokenAmount * 3n,
        ];

        for (const listingTokenAmount of listingTokenAmounts) {
          await listingsHandler.createListing(
            action,
            price,
            listingTokenAmount,
            min,
            max,
            owner.address
          );
        }

        const listings = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.AvailableAmount,
          SortDirection.Asc,
          0,
          100,
          100
        );

        for (let i = 0; i < listings.length - 1; i++) {
          expect(listings[i].availableTokenAmount).to.be.lte(
            listings[i + 1].availableTokenAmount
          );
        }
      });

      it('keeps listings min order price key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingsMinPerOrderAmounts = [min / 2n, min, min / 4n, min / 3n];

        for (const listingMinPerOrderAmount of listingsMinPerOrderAmounts) {
          await listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            listingMinPerOrderAmount,
            max,
            owner.address
          );
        }

        const listings = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.MinPricePerOrder,
          SortDirection.Asc,
          0,
          100,
          100
        );

        for (let i = 0; i < listings.length - 1; i++) {
          expect(listings[i].minPricePerOrder).to.be.lte(
            listings[i + 1].minPricePerOrder
          );
        }
      });

      it('keeps listings under action key', async function () {
        const { listingsHandler, owner } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        const listingsData = [
          { action: ListingAction.Buy, numOfListings: 3 },
          { action: ListingAction.Sell, numOfListings: 2 },
        ];

        listingsData.forEach(async ({ action, numOfListings }) => {
          for (let i = 0; i < numOfListings; i++) {
            await listingsHandler.createListing(
              action,
              price,
              tokenAmount,
              min,
              max,
              owner.address
            );
          }
        });

        listingsData.forEach(async ({ action, numOfListings }) => {
          const filter =
            action === ListingAction.Buy
              ? ListingsFilter.Buy
              : ListingsFilter.Sell;

          const listings = await listingsHandler.getSortedListings(
            filter,
            ListingsSortBy.MinPricePerOrder,
            SortDirection.Asc,
            0,
            100,
            100
          );

          expect(listings).to.have.lengthOf(numOfListings);
        });
      });
    });

    describe('updateListing', function () {
      beforeEach(async function () {
        const { listingsHandler, owner } = await loadFixture(deployFixture);
        const { action, price, tokenAmount, min, max } = this.listingData;

        await listingsHandler.createListing(
          action,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );
      });

      it('updates a listing', async function () {
        const { listingsHandler, owner } = this;

        const price = multiplyByTenPow(2n, CURRENCY_DECIMALS);
        const tokenAmount = multiplyByTenPow(10000n, TOKEN_DECIMALS);
        const min = multiplyByTenPow(100n, CURRENCY_DECIMALS);
        const max = multiplyByTenPow(200n, CURRENCY_DECIMALS);

        await listingsHandler.updateListing(
          INITIAL_LISTING_ID,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );

        const listing = await listingsHandler.getListing(INITIAL_LISTING_ID);

        expect(listing.id).to.equal(INITIAL_LISTING_ID);
        expect(listing.price).to.equal(price);
        expect(listing.totalTokenAmount).to.equal(tokenAmount);
        expect(listing.availableTokenAmount).to.equal(tokenAmount);
        expect(listing.minPricePerOrder).to.equal(min);
        expect(listing.maxPricePerOrder).to.equal(max);
        expect(listing.creator).to.equal(owner.address);
        expect(listing.isDeleted).to.be.false;
      });

      it('reverts if not accessed by owner', async function () {
        const { listingsHandler, owner, otherUser } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await expect(
          listingsHandler
            .connect(otherUser)
            .updateListing(
              INITIAL_LISTING_ID,
              price,
              tokenAmount,
              min,
              max,
              owner.address
            )
        )
          .to.be.revertedWithCustomError(
            listingsHandler,
            'OwnableUnauthorizedAccount'
          )
          .withArgs(otherUser.address);
      });

      it('emits an event', async function () {
        const { listingsHandler, owner } = this;
        const { action } = this.listingData;

        const price = multiplyByTenPow(2n, CURRENCY_DECIMALS);
        const tokenAmount = multiplyByTenPow(10000n, TOKEN_DECIMALS);
        const min = multiplyByTenPow(100n, CURRENCY_DECIMALS);
        const max = multiplyByTenPow(200n, CURRENCY_DECIMALS);

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.emit(listingsHandler, 'ListingUpdated')
          .withArgs(
            listingStruct({
              id: INITIAL_LISTING_ID,
              action,
              price,
              totalTokenAmount: tokenAmount,
              availableTokenAmount: tokenAmount,
              minPricePerOrder: min,
              maxPricePerOrder: max,
              creator: owner.address,
              isDeleted: false,
            })
          );
      });

      it('reverts if provided non-existing id', async function () {
        const { listingsHandler, otherUser } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        const id = INITIAL_LISTING_ID + 1;

        await expect(
          listingsHandler.updateListing(
            id,
            price,
            tokenAmount,
            min,
            max,
            otherUser.address
          )
        )
          .to.be.revertedWithCustomError(listingsHandler, 'ListingDoesNotExist')
          .withArgs(id);
      });

      it('reverts if sender is not the listing creator', async function () {
        const { listingsHandler, otherUser } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            otherUser.address
          )
        )
          .to.be.revertedWithCustomError(
            listingsHandler,
            'UserIsNotListingCreator'
          )
          .withArgs(INITIAL_LISTING_ID, otherUser.address);
      });

      it('reverts if listing has active orders', async function () {
        const {
          fiatTokenPair,
          listingsHandler,
          ordersHandler,
          owner: listingCreator,
          otherUser: orderCreator,
        } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          orderCreator.address
        );

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            listingCreator.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingCannotBeEditedOrRemoved'
          )
          .withArgs(INITIAL_LISTING_ID);
      });

      it('updates listing if all orders are cancelled', async function () {
        const {
          listingsHandler,
          ordersHandler,
          owner: listingCreator,
          otherUser: orderCreator,
        } = this;
        const { price, tokenAmount, min, max } = this.listingData;
        const newTokenAmount = tokenAmount * 2n;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          orderCreator.address
        );

        await ordersHandler.rejectOrder(
          INITIAL_ORDER_ID,
          listingCreator.address
        );

        await listingsHandler.updateListing(
          INITIAL_LISTING_ID,
          price,
          newTokenAmount,
          min,
          max,
          listingCreator.address
        );

        const listing = await listingsHandler.getListing(INITIAL_LISTING_ID);

        expect(listing.totalTokenAmount).to.equal(newTokenAmount);
        expect(listing.availableTokenAmount).to.equal(newTokenAmount);
      });

      const tests = [
        {
          modifier: 'higher',
          change: 50000000n,
        },
        {
          modifier: 'lower',
          change: -50000000n,
        },
      ];

      for (const { modifier, change } of tests) {
        it(`corrects deposit amount when selling tokens and token amount is ${modifier}`, async function () {
          const { fiatTokenPair, listingsHandler, token, owner } = this;
          const { price, tokenAmount, min, max } = this.listingData;

          const newTokenAmount = tokenAmount + change;
          const newMax = multiplyByTenPow(
            price * newTokenAmount,
            CURRENCY_DECIMALS - TOKEN_DECIMALS
          );
          const newMin = newMax;

          await token.approve(fiatTokenPair.target, tokenAmount);
          await listingsHandler.createListing(
            ListingAction.Sell,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          );

          await token.approve(fiatTokenPair.target, newTokenAmount);

          await expect(
            listingsHandler.updateListing(
              INITIAL_LISTING_ID + 1,
              price,
              newTokenAmount,
              newMin,
              newMax,
              owner.address
            )
          ).to.changeTokenBalances(
            token,
            [owner, fiatTokenPair],
            [-change, change]
          );
        });
      }

      it('reverts if listing is deleted', async function () {
        const { listingsHandler, owner } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await listingsHandler.deleteListing(INITIAL_LISTING_ID, owner.address);

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(listingsHandler, 'ListingIsDeleted')
          .withArgs(INITIAL_LISTING_ID);
      });

      it('reverts if minimum price per order is zero', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const { price, tokenAmount, max } = this.listingData;

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            0,
            max,
            owner.address
          )
        ).to.be.revertedWithCustomError(
          fiatTokenPair,
          'ListingMinPerOrderIsZero'
        );
      });

      it('reverts if minimum price per order is greater than maximum price per order', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const { price, tokenAmount, max } = this.listingData;

        const min = max + 1n;

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingMinPerOrderGreaterThanMaxPerOrder'
          )
          .withArgs(min, max);
      });

      it('reverts if the maximum price per order is greater than total price', async function () {
        const { fiatTokenPair, listingsHandler, owner } = this;
        const { price, tokenAmount, min, max: totalPrice } = this.listingData;

        const max = totalPrice + 1n;

        await expect(
          listingsHandler.updateListing(
            INITIAL_LISTING_ID,
            price,
            tokenAmount,
            min,
            max,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingMaxPerOrderGreaterThanTotalPrice'
          )
          .withArgs(max, totalPrice);
      });

      it('updates price key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingPrices = [price * 2n, price, price * 4n, price * 3n];
        const lowestPriceListingId = INITIAL_LISTING_ID + 1;

        for (const listingPrice of listingPrices) {
          await listingsHandler.createListing(
            action,
            listingPrice,
            tokenAmount,
            min,
            max,
            owner.address
          );
        }

        await listingsHandler.updateListing(
          lowestPriceListingId,
          price * 8n,
          tokenAmount,
          min,
          max,
          owner.address
        );

        const [firstListing] = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.Price,
          SortDirection.Desc,
          0,
          100,
          100
        );

        expect(firstListing.id).to.equal(lowestPriceListingId);
      });

      it('updates available amount key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingTokenAmounts = [
          tokenAmount * 2n,
          tokenAmount,
          tokenAmount * 4n,
          tokenAmount * 3n,
        ];
        const lowestTokenAmountListingId = INITIAL_LISTING_ID + 1;

        for (const listingTokenAmount of listingTokenAmounts) {
          await listingsHandler.createListing(
            action,
            price,
            listingTokenAmount,
            min,
            max,
            owner.address
          );
        }

        await listingsHandler.updateListing(
          lowestTokenAmountListingId,
          price,
          tokenAmount * 8n,
          min,
          max,
          owner.address
        );

        const [firstListing] = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.AvailableAmount,
          SortDirection.Desc,
          0,
          100,
          100
        );

        expect(firstListing.id).to.equal(lowestTokenAmountListingId);
      });

      it('updates min order price key', async function () {
        const { listingsHandler, owner } = this;
        const { action, price, tokenAmount, min, max } = this.listingData;

        const listingsMinPerOrderAmounts = [
          min / 2n,
          min / 6n,
          min / 4n,
          min / 3n,
        ];
        const lowestMinPerOrderListingId = INITIAL_LISTING_ID + 1;

        for (const listingMinPerOrderAmount of listingsMinPerOrderAmounts) {
          await listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            listingMinPerOrderAmount,
            max,
            owner.address
          );
        }

        await listingsHandler.updateListing(
          lowestMinPerOrderListingId,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );

        const [firstListing] = await listingsHandler.getSortedListings(
          ListingsFilter.All,
          ListingsSortBy.MinPricePerOrder,
          SortDirection.Desc,
          0,
          100,
          100
        );

        expect(firstListing.id).to.equal(lowestMinPerOrderListingId);
      });
    });

    describe('deleteListing', function () {
      beforeEach(async function () {
        const { listingsHandler, owner } = await loadFixture(deployFixture);
        const { action, price, tokenAmount, min, max } = this.listingData;

        await listingsHandler.createListing(
          action,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );
      });

      it('deletes a listing', async function () {
        const { listingsHandler, owner } = this;

        await listingsHandler.deleteListing(INITIAL_LISTING_ID, owner.address);

        const listing = await listingsHandler.getListing(INITIAL_LISTING_ID);

        expect(listing.id).to.equal(INITIAL_LISTING_ID);
        expect(listing.isDeleted).to.be.true;
      });

      it('reverts if not accessed by owner', async function () {
        const { listingsHandler, owner, otherUser } = this;

        await expect(
          listingsHandler
            .connect(otherUser)
            .deleteListing(INITIAL_LISTING_ID, owner.address)
        )
          .to.be.revertedWithCustomError(
            listingsHandler,
            'OwnableUnauthorizedAccount'
          )
          .withArgs(otherUser.address);
      });

      it('emits an event', async function () {
        const { listingsHandler, owner } = this;

        await expect(
          listingsHandler.deleteListing(INITIAL_LISTING_ID, owner.address)
        )
          .to.emit(listingsHandler, 'ListingDeleted')
          .withArgs(INITIAL_LISTING_ID);
      });

      it('reverts if sender is not the listing creator', async function () {
        const { listingsHandler, otherUser } = this;

        await expect(
          listingsHandler.deleteListing(INITIAL_LISTING_ID, otherUser.address)
        )
          .to.be.revertedWithCustomError(
            listingsHandler,
            'UserIsNotListingCreator'
          )
          .withArgs(INITIAL_LISTING_ID, otherUser.address);
      });

      it('reverts if provided non-existing id', async function () {
        const { listingsHandler, otherUser } = this;

        const id = INITIAL_LISTING_ID + 1;

        await expect(listingsHandler.deleteListing(id, otherUser.address))
          .to.be.revertedWithCustomError(listingsHandler, 'ListingDoesNotExist')
          .withArgs(id);
      });

      it('reverts if listing has active orders', async function () {
        const {
          fiatTokenPair,
          listingsHandler,
          ordersHandler,
          owner: listingCreator,
          otherUser: orderCreator,
        } = this;
        const { tokenAmount } = this.listingData;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          orderCreator.address
        );

        await expect(
          listingsHandler.deleteListing(
            INITIAL_LISTING_ID,
            listingCreator.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'ListingCannotBeEditedOrRemoved'
          )
          .withArgs(INITIAL_LISTING_ID);
      });

      it('deletes listing if all orders are cancelled', async function () {
        const {
          listingsHandler,
          ordersHandler,
          owner: listingCreator,
          otherUser: orderCreator,
        } = this;
        const { tokenAmount } = this.listingData;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          orderCreator.address
        );

        await ordersHandler.rejectOrder(
          INITIAL_ORDER_ID,
          listingCreator.address
        );

        await listingsHandler.deleteListing(
          INITIAL_LISTING_ID,
          listingCreator.address
        );

        const listing = await listingsHandler.getListing(INITIAL_LISTING_ID);

        expect(listing.isDeleted).to.be.true;
      });

      it('reverts if listing is deleted', async function () {
        const { listingsHandler, owner } = this;

        await listingsHandler.deleteListing(INITIAL_LISTING_ID, owner.address);

        await expect(
          listingsHandler.deleteListing(INITIAL_LISTING_ID, owner.address)
        )
          .to.be.revertedWithCustomError(listingsHandler, 'ListingIsDeleted')
          .withArgs(INITIAL_LISTING_ID);
      });

      it('returns tokens to the listing creator on sell listing', async function () {
        const { fiatTokenPair, listingsHandler, token, owner } = this;
        const { price, tokenAmount, min, max } = this.listingData;

        await token.approve(fiatTokenPair.target, tokenAmount);
        await listingsHandler.createListing(
          ListingAction.Sell,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );

        await expect(
          listingsHandler.deleteListing(INITIAL_LISTING_ID + 1, owner.address)
        ).to.changeTokenBalances(
          token,
          [owner, fiatTokenPair],
          [tokenAmount, -tokenAmount]
        );
      });
    });
  });

  describe('OrdersHandler', function () {
    beforeEach(async function () {
      const {
        listingsHandler,
        ordersHandler,
        owner: listingCreator,
        otherUser: orderCreator,
      } = await loadFixture(deployFixture);
      const { action, price, tokenAmount, min, max } = this.listingData;

      await listingsHandler.createListing(
        action,
        price,
        tokenAmount,
        min,
        max,
        listingCreator.address
      );

      async function advanceOrderToStatus(listingAction, orderId, orderStatus) {
        const orderStatusIndex = Object.keys(
          TESTS.acceptOrder[listingAction]
        ).findIndex((status) => Number(status) === orderStatus);
        const users = [listingCreator, orderCreator];

        for (let i = 0; i < orderStatusIndex; i++) {
          await ordersHandler.acceptOrder(orderId, users[i % 2].address);
        }
      }

      Object.assign(this, { advanceOrderToStatus });
    });

    describe('createOrder', function () {
      it('creates an order', async function () {
        const { ordersHandler, owner } = this;
        const { tokenAmount, max: totalPrice } = this.listingData;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          owner.address
        );

        const order = await ordersHandler.getOrder(INITIAL_ORDER_ID);

        expect(order.id).to.equal(INITIAL_ORDER_ID);
        expect(order.listingId).to.equal(INITIAL_LISTING_ID);
        expect(order.fiatAmount).to.equal(totalPrice);
        expect(order.tokenAmount).to.equal(tokenAmount);
        expect(order.creator).to.equal(owner.address);
        expect(order.statusHistory).to.deep.equal([OrderStatus.RequestSent]);
      });

      it('emits an event', async function () {
        const { ordersHandler, owner } = this;
        const { tokenAmount, max: totalPrice } = this.listingData;

        await expect(
          ordersHandler.createOrder(
            INITIAL_LISTING_ID,
            tokenAmount,
            owner.address
          )
        )
          .to.emit(ordersHandler, 'OrderCreated')
          .withArgs(
            orderStruct({
              id: INITIAL_ORDER_ID,
              fiatAmount: totalPrice,
              tokenAmount,
              listingId: INITIAL_LISTING_ID,
              statusHistory: [OrderStatus.RequestSent],
              creator: owner.address,
            })
          );
      });

      it('increments order id', async function () {
        const { ordersHandler, owner } = this;
        const { tokenAmount } = this.listingData;

        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          owner.address
        );
        await ordersHandler.createOrder(
          INITIAL_LISTING_ID,
          tokenAmount,
          owner.address
        );

        const orders = await ordersHandler.getOrders();

        expect(orders[0].id).to.equal(INITIAL_ORDER_ID);
        expect(orders[1].id).to.equal(INITIAL_ORDER_ID + 1);
      });

      it('reverts if not accessed by owner', async function () {
        const { ordersHandler, owner, otherUser } = this;
        const { tokenAmount } = this.listingData;

        await expect(
          ordersHandler
            .connect(otherUser)
            .createOrder(INITIAL_LISTING_ID, tokenAmount, owner.address)
        )
          .to.be.revertedWithCustomError(
            ordersHandler,
            'OwnableUnauthorizedAccount'
          )
          .withArgs(otherUser.address);
      });

      it('reverts if listing does not exist', async function () {
        const { listingsHandler, ordersHandler, owner } = this;
        const { tokenAmount } = this.listingData;

        const id = INITIAL_LISTING_ID + 1;

        await expect(ordersHandler.createOrder(id, tokenAmount, owner.address))
          .to.be.revertedWithCustomError(listingsHandler, 'ListingDoesNotExist')
          .withArgs(id);
      });

      it('reverts if order amount is less than listing minimum order amount', async function () {
        const { fiatTokenPair, ordersHandler, owner } = this;
        const { price, tokenAmount, min } = this.listingData;

        const orderAmount =
          tokenAmount - multiplyByTenPow(1000n, TOKEN_DECIMALS);
        const orderPrice = multiplyByTenPow(
          price * orderAmount,
          CURRENCY_DECIMALS - TOKEN_DECIMALS
        );

        await expect(
          ordersHandler.createOrder(
            INITIAL_LISTING_ID,
            orderAmount,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'OrderAmountLessThanListingMinPerOrder'
          )
          .withArgs(orderPrice, min);
      });

      it('reverts if order amount is greater than listing maximum order amount', async function () {
        const { fiatTokenPair, ordersHandler, owner } = this;
        const { price, tokenAmount, max } = this.listingData;

        const orderAmount =
          tokenAmount + multiplyByTenPow(1000n, TOKEN_DECIMALS);
        const orderPrice = multiplyByTenPow(
          price * orderAmount,
          CURRENCY_DECIMALS - TOKEN_DECIMALS
        );

        await expect(
          ordersHandler.createOrder(
            INITIAL_LISTING_ID,
            orderAmount,
            owner.address
          )
        )
          .to.be.revertedWithCustomError(
            fiatTokenPair,
            'OrderAmountGreaterThanListingMaxPerOrder'
          )
          .withArgs(orderPrice, max);
      });

      it('keeps orders under creator key', async function () {
        const { ordersHandler, owner: userA, otherUser: userB } = this;
        const { tokenAmount } = this.listingData;

        const ordersData = [
          { user: userA, numOfOrders: 3 },
          { user: userB, numOfOrders: 2 },
        ];

        ordersData.forEach(async ({ user, numOfOrders }) => {
          for (let i = 0; i < numOfOrders; i++) {
            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              user.address
            );
          }
        });

        ordersData.forEach(async ({ user, numOfOrders }) => {
          const orders = await ordersHandler.getUserOrders(user.address);

          expect(orders).to.have.lengthOf(numOfOrders);
        });
      });

      it('keeps orders under listing key', async function () {
        const { listingsHandler, ordersHandler, owner } = this;
        const { tokenAmount, price, action, min, max } = this.listingData;

        await listingsHandler.createListing(
          action,
          price,
          tokenAmount,
          min,
          max,
          owner.address
        );

        const ordersData = [
          { listingId: INITIAL_LISTING_ID, numOfOrders: 3 },
          { listingId: INITIAL_LISTING_ID + 1, numOfOrders: 2 },
        ];

        ordersData.forEach(async ({ listingId, numOfOrders }) => {
          for (let i = 0; i < numOfOrders; i++) {
            await ordersHandler.createOrder(
              listingId,
              tokenAmount,
              owner.address
            );
          }
        });

        ordersData.forEach(async ({ listingId, numOfOrders }) => {
          const orders = await ordersHandler.getListingOrders(listingId);

          expect(orders).to.have.lengthOf(numOfOrders);
        });
      });
    });

    const METHODS = [
      { name: 'acceptOrder', event: 'OrderAccepted' },
      { name: 'rejectOrder', event: 'OrderRejected' },
    ];
    const USER_LABELS = ['listing creator', 'order creator'];
    const TESTS = {
      acceptOrder: {
        [ListingAction.Buy]: {
          [OrderStatus.RequestSent]: {
            listingCreatorExpectedOutcome: OrderStatus.AssetsConfirmed,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.AssetsConfirmed]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.TokensDeposited,
          },
          [OrderStatus.TokensDeposited]: {
            listingCreatorExpectedOutcome: OrderStatus.PaymentSent,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.PaymentSent]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.Completed,
          },
        },
        [ListingAction.Sell]: {
          [OrderStatus.RequestSent]: {
            listingCreatorExpectedOutcome: OrderStatus.AssetsConfirmed,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.AssetsConfirmed]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.PaymentSent,
          },
          [OrderStatus.PaymentSent]: {
            listingCreatorExpectedOutcome: OrderStatus.Completed,
            orderCreatorExpectedOutcome: undefined,
          },
        },
      },
      rejectOrder: {
        [ListingAction.Buy]: {
          [OrderStatus.RequestSent]: {
            listingCreatorExpectedOutcome: OrderStatus.Cancelled,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.AssetsConfirmed]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.Cancelled,
          },
          [OrderStatus.TokensDeposited]: {
            listingCreatorExpectedOutcome: OrderStatus.Cancelled,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.PaymentSent]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.InDispute,
          },
        },
        [ListingAction.Sell]: {
          [OrderStatus.RequestSent]: {
            listingCreatorExpectedOutcome: OrderStatus.Cancelled,
            orderCreatorExpectedOutcome: undefined,
          },
          [OrderStatus.AssetsConfirmed]: {
            listingCreatorExpectedOutcome: undefined,
            orderCreatorExpectedOutcome: OrderStatus.Cancelled,
          },
          [OrderStatus.PaymentSent]: {
            listingCreatorExpectedOutcome: OrderStatus.InDispute,
            orderCreatorExpectedOutcome: undefined,
          },
        },
      },
    };

    METHODS.forEach(({ name: methodName, event }) => {
      describe(methodName, function () {
        beforeEach(async function () {
          const {
            fiatTokenPair,
            token,
            owner: listingCreator,
            otherUser: orderCreator,
          } = this;
          const { tokenAmount } = this.listingData;

          await token.mint(orderCreator.address, tokenAmount);
          await token
            .connect(listingCreator)
            .approve(fiatTokenPair.target, tokenAmount);
          await token
            .connect(orderCreator)
            .approve(fiatTokenPair.target, tokenAmount);
        });

        it('emits an event', async function () {
          const {
            ordersHandler,
            owner: listingCreator,
            otherUser: orderCreator,
          } = this;

          const { tokenAmount } = this.listingData;

          await ordersHandler.createOrder(
            INITIAL_LISTING_ID,
            tokenAmount,
            orderCreator.address
          );

          await expect(
            ordersHandler[methodName](INITIAL_ORDER_ID, listingCreator.address)
          )
            .to.emit(ordersHandler, event)
            .withArgs(
              INITIAL_ORDER_ID,
              listingCreator.address,
              anyValue,
              anyValue
            );
        });

        it('reverts if not accessed by owner', async function () {
          const { ordersHandler, owner, otherUser } = this;

          await expect(
            ordersHandler
              .connect(otherUser)
              [methodName](INITIAL_ORDER_ID, owner.address)
          )
            .to.be.revertedWithCustomError(
              ordersHandler,
              'OwnableUnauthorizedAccount'
            )
            .withArgs(otherUser.address);
        });

        it('reverts if order does not exist', async function () {
          const { ordersHandler, owner } = this;

          const id = INITIAL_ORDER_ID + 1;

          await expect(
            ordersHandler[methodName](id, owner.address)
          ).to.be.revertedWithCustomError(ordersHandler, 'OrderDoesNotExist');
        });

        if (methodName === 'acceptOrder') {
          it('subtracts available token amount from listing when assets are confirmed', async function () {
            const {
              ordersHandler,
              listingsHandler,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;

            const { tokenAmount } = this.listingData;

            {
              await ordersHandler.createOrder(
                INITIAL_LISTING_ID,
                tokenAmount,
                orderCreator.address
              );

              const listing =
                await listingsHandler.getListing(INITIAL_LISTING_ID);

              expect(listing.availableTokenAmount).to.equal(
                listing.totalTokenAmount
              );
            }

            {
              await advanceOrderToStatus(
                ListingAction.Buy,
                INITIAL_ORDER_ID,
                OrderStatus.AssetsConfirmed
              );

              const listing =
                await listingsHandler.getListing(INITIAL_LISTING_ID);

              expect(listing.availableTokenAmount).to.equal(0);
            }
          });

          it('reverts if there is insufficient available amount of tokens in the listing', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              owner: listingCreator,
              otherUser: orderCreator,
            } = this;
            const { tokenAmount } = this.listingData;

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await ordersHandler.acceptOrder(
              INITIAL_ORDER_ID,
              listingCreator.address
            );

            await expect(
              ordersHandler.acceptOrder(
                INITIAL_ORDER_ID + 1,
                listingCreator.address
              )
            )
              .to.be.revertedWithCustomError(
                fiatTokenPair,
                'OrderAmountGreaterThanListingAvailableAmount'
              )
              .withArgs(tokenAmount, 0);
          });

          it('transfers tokens from order creator upon advancing to TokensDeposited status', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              token,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount } = this.listingData;

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Buy,
              INITIAL_ORDER_ID,
              OrderStatus.AssetsConfirmed
            );

            await expect(
              ordersHandler.acceptOrder(INITIAL_ORDER_ID, orderCreator.address)
            ).to.changeTokenBalances(
              token,
              [orderCreator, fiatTokenPair],
              [-tokenAmount, tokenAmount]
            );
          });

          it('reverts if user does not have the required tokens', async function () {
            const {
              ordersHandler,
              token,
              owner: listingCreator,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount } = this.listingData;

            const orderCreatorBalance = await token.balanceOf(
              orderCreator.address
            );
            await token
              .connect(orderCreator)
              .transfer(listingCreator.address, orderCreatorBalance);

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Buy,
              INITIAL_ORDER_ID,
              OrderStatus.AssetsConfirmed
            );

            await expect(
              ordersHandler.acceptOrder(INITIAL_ORDER_ID, orderCreator.address)
            ).to.be.revertedWithCustomError(token, 'ERC20InsufficientBalance');
          });

          it('transfers tokens to listing creator if ListingAction.Buy order is completed', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              token,
              owner: listingCreator,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount } = this.listingData;

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Buy,
              INITIAL_ORDER_ID,
              OrderStatus.PaymentSent
            );

            await expect(
              ordersHandler.acceptOrder(INITIAL_ORDER_ID, orderCreator.address)
            ).to.changeTokenBalances(
              token,
              [listingCreator, fiatTokenPair],
              [tokenAmount, -tokenAmount]
            );
          });

          it('transfers tokens to order creator if ListingAction.Sell order is completed', async function () {
            const {
              fiatTokenPair,
              listingsHandler,
              ordersHandler,
              token,
              owner: listingCreator,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount, price, min, max } = this.listingData;

            await listingsHandler.createListing(
              ListingAction.Sell,
              price,
              tokenAmount,
              min,
              max,
              listingCreator.address
            );

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID + 1,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Sell,
              INITIAL_ORDER_ID,
              OrderStatus.PaymentSent
            );

            await expect(
              ordersHandler.acceptOrder(
                INITIAL_ORDER_ID,
                listingCreator.address
              )
            ).to.changeTokenBalances(
              token,
              [orderCreator, fiatTokenPair],
              [tokenAmount, -tokenAmount]
            );
          });
        } else if (methodName === 'rejectOrder') {
          it('adds back available token amount to listing if assets were confirmed', async function () {
            const {
              ordersHandler,
              listingsHandler,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount } = this.listingData;

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Buy,
              INITIAL_ORDER_ID,
              OrderStatus.AssetsConfirmed
            );

            await ordersHandler.rejectOrder(
              INITIAL_ORDER_ID,
              orderCreator.address
            );

            const listing =
              await listingsHandler.getListing(INITIAL_LISTING_ID);

            expect(listing.availableTokenAmount).to.equal(
              listing.totalTokenAmount
            );
          });

          it('returns the tokens to order creator if tokens were deposited', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              token,
              owner: listingCreator,
              otherUser: orderCreator,
              advanceOrderToStatus,
            } = this;
            const { tokenAmount } = this.listingData;

            await ordersHandler.createOrder(
              INITIAL_LISTING_ID,
              tokenAmount,
              orderCreator.address
            );

            await advanceOrderToStatus(
              ListingAction.Buy,
              INITIAL_ORDER_ID,
              OrderStatus.TokensDeposited
            );

            await expect(
              ordersHandler.rejectOrder(
                INITIAL_ORDER_ID,
                listingCreator.address
              )
            ).to.changeTokenBalances(
              token,
              [orderCreator, fiatTokenPair],
              [tokenAmount, -tokenAmount]
            );
          });
        }

        describe('Status updates', function () {
          USER_LABELS.forEach((userLabel, userIndex) => {
            Object.entries(TESTS[methodName]).forEach(
              ([listingActionToCheck, statuses]) => {
                Object.entries(statuses).forEach(
                  ([
                    orderStatusToCheck,
                    {
                      listingCreatorExpectedOutcome,
                      orderCreatorExpectedOutcome,
                    },
                  ]) => {
                    const expectedOutcome = [
                      listingCreatorExpectedOutcome,
                      orderCreatorExpectedOutcome,
                    ][userIndex];
                    const numOfStatuses = Object.keys(OrderStatus).length;
                    const listingAction = findObjectKeyByValue(
                      ListingAction,
                      Number(listingActionToCheck)
                    );
                    const orderStatusName = findObjectKeyByValue(
                      OrderStatus,
                      Number(orderStatusToCheck)
                    );
                    const testOutcome = (() => {
                      if (expectedOutcome === undefined) {
                        return 'REVERTS';
                      }

                      const expectedOrderStatusName = findObjectKeyByValue(
                        OrderStatus,
                        Number(expectedOutcome)
                      );

                      return `OrderStatus.${expectedOrderStatusName}`;
                    })();

                    it(`${userLabel} interacts on ListingAction.${listingAction} + OrderStatus.${orderStatusName} = ${testOutcome}`, async function () {
                      const {
                        fiatTokenPair,
                        listingsHandler,
                        ordersHandler,
                        owner: listingCreator,
                        otherUser: orderCreator,
                      } = this;

                      const { price, tokenAmount, min, max } = this.listingData;

                      await listingsHandler.createListing(
                        listingActionToCheck,
                        price,
                        tokenAmount,
                        min,
                        max,
                        listingCreator.address
                      );

                      await ordersHandler.createOrder(
                        INITIAL_LISTING_ID + 1,
                        tokenAmount,
                        orderCreator.address
                      );

                      const users = [listingCreator, orderCreator];
                      const userToCheck = users[userIndex];

                      for (let i = 0; i < numOfStatuses; i++) {
                        const order =
                          await ordersHandler.getOrder(INITIAL_ORDER_ID);
                        const orderStatus = getOrderCurrentStatus(order);

                        if (orderStatus === Number(orderStatusToCheck)) {
                          const tx = ordersHandler[methodName](
                            INITIAL_ORDER_ID,
                            userToCheck.address
                          );

                          if (expectedOutcome === undefined) {
                            await expect(tx).to.be.revertedWithCustomError(
                              fiatTokenPair,
                              'OrderCannotBeInteractedWithNow'
                            );
                          } else {
                            await expect(tx)
                              .to.emit(ordersHandler, event)
                              .withArgs(
                                INITIAL_ORDER_ID,
                                userToCheck.address,
                                orderStatusToCheck,
                                expectedOutcome
                              );
                          }

                          break;
                        }

                        await ordersHandler.acceptOrder(
                          INITIAL_ORDER_ID,
                          users[i % 2].address
                        );
                      }
                    });
                  }
                );
              }
            );
          });
        });
      });
    });

    const DISPUTE_TESTS = [
      {
        methodName: 'acceptDispute',
        expectedOrderStatus: OrderStatus.Cancelled,
        event: 'OrderRejected',
      },
      {
        methodName: 'rejectDispute',
        expectedOrderStatus: OrderStatus.Completed,
        event: 'OrderAccepted',
      },
    ];

    DISPUTE_TESTS.forEach(({ methodName, expectedOrderStatus, event }) => {
      describe(methodName, function () {
        beforeEach(async function () {
          const {
            fiatTokenPair,
            ordersHandler,
            token,
            otherUser: orderCreator,
            advanceOrderToStatus,
          } = this;
          const { tokenAmount } = this.listingData;

          await ordersHandler.createOrder(
            INITIAL_LISTING_ID,
            tokenAmount,
            orderCreator.address
          );

          await token.mint(orderCreator.address, tokenAmount);
          await token
            .connect(orderCreator)
            .approve(fiatTokenPair.target, tokenAmount);

          await advanceOrderToStatus(
            ListingAction.Buy,
            INITIAL_ORDER_ID,
            OrderStatus.PaymentSent
          );

          await ordersHandler.rejectOrder(
            INITIAL_ORDER_ID,
            orderCreator.address
          );
        });

        it('correctly updates the order which is in dispute', async function () {
          const { ordersHandler, owner } = this;

          await ordersHandler[methodName](INITIAL_ORDER_ID, owner.address);
          const order = await ordersHandler.getOrder(INITIAL_ORDER_ID);

          expect(getOrderCurrentStatus(order)).to.equal(expectedOrderStatus);
        });

        it('reverts if not accessed by owner', async function () {
          const { ordersHandler, otherUser } = this;

          await expect(
            ordersHandler
              .connect(otherUser)
              [methodName](INITIAL_ORDER_ID, otherUser.address)
          )
            .to.be.revertedWithCustomError(
              ordersHandler,
              'OwnableUnauthorizedAccount'
            )
            .withArgs(otherUser.address);
        });

        it('reverts if order is not in dispute', async function () {
          const {
            fiatTokenPair,
            listingsHandler,
            ordersHandler,
            token,
            owner: listingCreator,
            otherUser: orderCreator,
          } = this;
          const { action, price, tokenAmount, min, max } = this.listingData;
          const users = [listingCreator, orderCreator];
          const listingId = INITIAL_LISTING_ID + 1;
          const orderId = INITIAL_ORDER_ID + 1;
          const iterations = 5;

          await listingsHandler.createListing(
            action,
            price,
            tokenAmount,
            min,
            max,
            listingCreator.address
          );

          await ordersHandler.createOrder(
            listingId,
            tokenAmount,
            orderCreator.address
          );

          await token.mint(orderCreator.address, tokenAmount);
          await token
            .connect(orderCreator)
            .approve(fiatTokenPair.target, tokenAmount);

          for (let i = 0; i < iterations; i++) {
            await expect(
              ordersHandler[methodName](orderId, users[i % 2].address)
            )
              .to.be.revertedWithCustomError(
                ordersHandler,
                'OrderIsNotInDispute'
              )
              .withArgs(orderId);

            if (i < iterations - 1)
              await ordersHandler.acceptOrder(orderId, users[i % 2]);
          }
        });

        it('emits an event', async function () {
          const { ordersHandler, owner } = this;

          await expect(
            ordersHandler[methodName](INITIAL_ORDER_ID, owner.address)
          )
            .to.emit(ordersHandler, event)
            .withArgs(
              INITIAL_ORDER_ID,
              owner.address,
              OrderStatus.InDispute,
              expectedOrderStatus
            );
        });

        if (methodName === 'acceptDispute') {
          it('adds back available token amount to listing if assets were confirmed', async function () {
            const {
              ordersHandler,
              listingsHandler,
              otherUser: orderCreator,
            } = this;

            await ordersHandler.acceptDispute(
              INITIAL_ORDER_ID,
              orderCreator.address
            );

            const listing =
              await listingsHandler.getListing(INITIAL_LISTING_ID);

            expect(listing.availableTokenAmount).to.equal(
              listing.totalTokenAmount
            );
          });

          it('returns the tokens to order creator if tokens were deposited', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              token,
              owner: listingCreator,
              otherUser: orderCreator,
            } = this;
            const { tokenAmount } = this.listingData;

            await expect(
              ordersHandler.acceptDispute(
                INITIAL_ORDER_ID,
                listingCreator.address
              )
            ).to.changeTokenBalances(
              token,
              [orderCreator, fiatTokenPair],
              [tokenAmount, -tokenAmount]
            );
          });
        } else if (methodName === 'rejectDispute') {
          it('releases the tokens to listing creator if tokens were deposited', async function () {
            const {
              fiatTokenPair,
              ordersHandler,
              token,
              owner: listingCreator,
            } = this;
            const { tokenAmount } = this.listingData;

            await expect(
              ordersHandler.rejectDispute(
                INITIAL_ORDER_ID,
                listingCreator.address
              )
            ).to.changeTokenBalances(
              token,
              [listingCreator, fiatTokenPair],
              [tokenAmount, -tokenAmount]
            );
          });
        }
      });
    });
  });
});
