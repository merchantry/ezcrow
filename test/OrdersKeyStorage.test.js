const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ListingAction, OrderStatus } = require('./utils/enums');

describe('OrdersKeyStorage', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const ordersKeyStorage = await ethers
      .getContractFactory('OrdersKeyStorage')
      .then(contract => contract.deploy(owner.address));

    return { ordersKeyStorage, owner, otherUser };
  }

  function getListingAndOrdersData(listingCreator, orderCreator) {
    const listing = {
      id: 1,
      action: ListingAction.Buy,
      price: 10,
      totalTokenAmount: 100,
      availableTokenAmount: 100,
      minPricePerOrder: 100,
      maxPricePerOrder: 100,
      creator: listingCreator.address,
      isDeleted: false,
    };

    const orders = [
      {
        id: 1,
        fiatAmount: 1000,
        tokenAmount: 100,
        listingId: 1,
        statusHistory: [OrderStatus.RequestSent],
        creator: orderCreator.address,
      },
      {
        id: 2,
        fiatAmount: 1000,
        tokenAmount: 100,
        listingId: 1,
        statusHistory: [OrderStatus.RequestSent],
        creator: orderCreator.address,
      },
    ];

    return { listing, orders };
  }

  beforeEach(async function () {
    const fixtureData = await loadFixture(deployFixture);
    const { listing, orders } = getListingAndOrdersData(
      fixtureData.owner,
      fixtureData.otherUser
    );

    Object.assign(this, fixtureData, { listing, orders });
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { ordersKeyStorage } = this;

      expect(ordersKeyStorage.target).not.to.be.undefined;
    });
  });

  describe('initializeKeys', function () {
    it('initializes listing keys', async function () {
      const { ordersKeyStorage, listing, orders } = this;

      await ordersKeyStorage.initializeKeys(orders[0], listing);
      await ordersKeyStorage.initializeKeys(orders[1], listing);

      const listingOrderIds = await ordersKeyStorage.getListingOrderIds(
        listing.id
      );

      expect(listingOrderIds).to.deep.equal(orders.map(order => order.id));
    });

    it('initializes order creator keys', async function () {
      const {
        ordersKeyStorage,
        listing,
        orders,
        otherUser: orderCreator,
      } = this;

      await ordersKeyStorage.initializeKeys(orders[0], listing);
      await ordersKeyStorage.initializeKeys(orders[1], listing);

      const orderCreatorOrderIds = await ordersKeyStorage.getUserOrderIds(
        orderCreator.address
      );

      expect(orderCreatorOrderIds).to.deep.equal(orders.map(order => order.id));
    });

    it('initializes listing creator keys', async function () {
      const { ordersKeyStorage, listing, orders, owner: listingCreator } = this;

      await ordersKeyStorage.initializeKeys(orders[0], listing);
      await ordersKeyStorage.initializeKeys(orders[1], listing);

      const listingCreatorOrderIds = await ordersKeyStorage.getUserOrderIds(
        listingCreator.address
      );

      expect(listingCreatorOrderIds).to.deep.equal(
        orders.map(order => order.id)
      );
    });

    it('reverts if not accessed by owner', async function () {
      const {
        ordersKeyStorage,
        listing,
        orders: [order],
        otherUser,
      } = this;

      await expect(
        ordersKeyStorage.connect(otherUser).initializeKeys(order, listing)
      ).to.be.revertedWithCustomError(
        ordersKeyStorage,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
