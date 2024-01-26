const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { ListingAction } = require('./utils/enums');

describe('ListingsKeyStorage', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const listingsKeyStorage = await ethers
      .getContractFactory('ListingsKeyStorage')
      .then(contract => contract.deploy(owner.address));

    return { listingsKeyStorage, owner, otherUser };
  }

  function getListingData(listingCreator) {
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

    return listing;
  }

  beforeEach(async function () {
    const fixtureData = await loadFixture(deployFixture);
    Object.assign(this, fixtureData, {
      listing: getListingData(fixtureData.owner),
    });
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { listingsKeyStorage } = this;

      expect(listingsKeyStorage.target).not.to.be.undefined;
    });
  });

  describe('initializeKeys', function () {
    it('initializes creator keys', async function () {
      const { listingsKeyStorage, listing, owner } = this;

      await listingsKeyStorage.initializeKeys(listing);

      const listingOrderIds = await listingsKeyStorage.getUserListingIds(
        owner.address
      );

      expect(listingOrderIds).to.deep.equal([listing.id]);
    });

    it('reverts if not accessed by owner', async function () {
      const { listingsKeyStorage, listing, otherUser } = this;

      await expect(
        listingsKeyStorage.connect(otherUser).initializeKeys(listing)
      ).to.be.revertedWithCustomError(
        listingsKeyStorage,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
