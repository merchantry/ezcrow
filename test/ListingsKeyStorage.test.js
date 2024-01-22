const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  ListingAction,
  SortDirection,
  ListingsFilter,
  ListingsSortBy,
} = require('./utils/enums');

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

    it('initializes price keys', async function () {
      const { listingsKeyStorage, listing } = this;

      const listings = [
        {
          ...listing,
          id: 1,
          price: listing.price,
        },
        {
          ...listing,
          id: 2,
          price: listing.price * 2,
        },
        {
          ...listing,
          id: 3,
          price: listing.price * 3,
        },
      ];
      const listingIds = listings.map(listing => listing.id);

      for (const listing of listings) {
        await listingsKeyStorage.initializeKeys(listing);
      }

      const sortedIds = await listingsKeyStorage.sortAndFilterIds(
        listingIds,
        ListingsFilter.All,
        ListingsSortBy.Price,
        SortDirection.Desc
      );

      expect(sortedIds).to.deep.equal(listingIds.reverse());
    });

    it('initializes available amount keys', async function () {
      const { listingsKeyStorage, listing } = this;

      const listings = [
        {
          ...listing,
          id: 1,
          availableTokenAmount: listing.availableTokenAmount,
          totalTokenAmount: listing.totalTokenAmount,
        },
        {
          ...listing,
          id: 2,
          availableTokenAmount: listing.availableTokenAmount * 2,
          totalTokenAmount: listing.totalTokenAmount * 2,
        },
        {
          ...listing,
          id: 3,
          availableTokenAmount: listing.availableTokenAmount * 3,
          totalTokenAmount: listing.totalTokenAmount * 3,
        },
      ];
      const listingIds = listings.map(listing => listing.id);

      for (const listing of listings) {
        await listingsKeyStorage.initializeKeys(listing);
      }

      const sortedIds = await listingsKeyStorage.sortAndFilterIds(
        listingIds,
        ListingsFilter.All,
        ListingsSortBy.AvailableAmount,
        SortDirection.Desc
      );

      expect(sortedIds).to.deep.equal(listingIds.reverse());
    });

    it('initializes min order price amount keys', async function () {
      const { listingsKeyStorage, listing } = this;

      const listings = [
        {
          ...listing,
          id: 1,
          minPricePerOrder: listing.minPricePerOrder / 10,
        },
        {
          ...listing,
          id: 2,
          minPricePerOrder: listing.minPricePerOrder / 4,
        },
        {
          ...listing,
          id: 3,
          minPricePerOrder: listing.minPricePerOrder / 2,
        },
      ];
      const listingIds = listings.map(listing => listing.id);

      for (const listing of listings) {
        await listingsKeyStorage.initializeKeys(listing);
      }

      const sortedIds = await listingsKeyStorage.sortAndFilterIds(
        listingIds,
        ListingsFilter.All,
        ListingsSortBy.MinPricePerOrder,
        SortDirection.Desc
      );

      expect(sortedIds).to.deep.equal(listingIds.reverse());
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

  describe('updateKeys', function () {
    beforeEach(async function () {
      const { listingsKeyStorage, listing } = this;

      const listings = [
        {
          ...listing,
          id: 1,
          price: listing.price,
          availableTokenAmount: listing.availableTokenAmount,
          totalTokenAmount: listing.totalTokenAmount,
          minPricePerOrder: listing.minPricePerOrder / 10,
        },
        {
          ...listing,
          id: 2,
          price: listing.price * 2,
          availableTokenAmount: listing.availableTokenAmount * 2,
          totalTokenAmount: listing.totalTokenAmount * 2,
          minPricePerOrder: listing.minPricePerOrder / 4,
        },
        {
          ...listing,
          id: 3,
          price: listing.price * 3,
          availableTokenAmount: listing.availableTokenAmount * 3,
          totalTokenAmount: listing.totalTokenAmount * 3,
          minPricePerOrder: listing.minPricePerOrder / 2,
        },
      ];

      const listingIds = listings.map(listing => listing.id);

      for (const listing of listings) {
        await listingsKeyStorage.initializeKeys(listing);
      }

      Object.assign(this, { listings, listingIds });
    });

    it('updates price key', async function () {
      const { listingsKeyStorage, listing, listingIds } = this;

      const newListing = {
        ...listing,
        id: 3,
        price: listing.price / 2,
      };

      await listingsKeyStorage.updateKeys(newListing);

      const [lowestPriceListingId] = await listingsKeyStorage.sortAndFilterIds(
        listingIds,
        ListingsFilter.All,
        ListingsSortBy.Price,
        SortDirection.Asc
      );

      expect(lowestPriceListingId).to.equal(newListing.id);
    });

    it('updates available amount key', async function () {
      const { listingsKeyStorage, listing, listingIds } = this;

      const newListing = {
        ...listing,
        id: 3,
        availableTokenAmount: listing.availableTokenAmount / 2,
        totalTokenAmount: listing.totalTokenAmount / 2,
      };

      await listingsKeyStorage.updateKeys(newListing);

      const [lowestAvailableAmountListingId] =
        await listingsKeyStorage.sortAndFilterIds(
          listingIds,
          ListingsFilter.All,
          ListingsSortBy.AvailableAmount,
          SortDirection.Asc
        );

      expect(lowestAvailableAmountListingId).to.equal(newListing.id);
    });

    it('updates min order price key', async function () {
      const { listingsKeyStorage, listing, listingIds } = this;

      const newListing = {
        ...listing,
        id: 3,
        minPricePerOrder: listing.minPricePerOrder / 20,
      };

      await listingsKeyStorage.updateKeys(newListing);

      const [lowestMinOrderPriceListingId] =
        await listingsKeyStorage.sortAndFilterIds(
          listingIds,
          ListingsFilter.All,
          ListingsSortBy.MinPricePerOrder,
          SortDirection.Asc
        );

      expect(lowestMinOrderPriceListingId).to.equal(newListing.id);
    });

    it('reverts if not accessed by owner', async function () {
      const { listingsKeyStorage, listing, otherUser } = this;

      await expect(
        listingsKeyStorage.connect(otherUser).updateKeys(listing)
      ).to.be.revertedWithCustomError(
        listingsKeyStorage,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
