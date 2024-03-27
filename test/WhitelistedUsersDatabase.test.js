const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const CURRENCY = 'USD';
const TELEGRAM_HANDLE = 'userA_telegram';
const PAYMENT_METHODS = ['PayPal', 'Bank Transfer'];

describe('WhitelistedUsersDatabase', function () {
  async function deployFixture() {
    const [owner, userA, userB] = await ethers.getSigners();

    const whitelistedUsersDatabase = await ethers
      .getContractFactory('WhitelistedUsersDatabase')
      .then(contract => contract.deploy(owner.address));

    return { whitelistedUsersDatabase, owner, userA, userB };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { whitelistedUsersDatabase } = this;

      expect(whitelistedUsersDatabase.target).to.not.be.undefined;
    });
  });

  describe('updateUser', function () {
    it('updates user data', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHODS
      );
      const userData = await whitelistedUsersDatabase.getUserData(
        userA.address,
        CURRENCY
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.paymentMethods).to.deep.equal(PAYMENT_METHODS);
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .updateUser(userA.address, CURRENCY, TELEGRAM_HANDLE, PAYMENT_METHODS)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });

    it('emits an event', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase.updateUser(
          userA.address,
          CURRENCY,
          TELEGRAM_HANDLE,
          PAYMENT_METHODS
        )
      )
        .to.emit(whitelistedUsersDatabase, 'UserDataUpdated')
        .withArgs(userA.address, CURRENCY);
    });
  });

  describe('whitelistUser', function () {
    it('whitelists a user', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
      const isWhitelisted = await whitelistedUsersDatabase.isWhitelisted(
        userA.address,
        CURRENCY
      );

      expect(isWhitelisted).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .whitelistUser(userA.address, CURRENCY)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });

    it('emits an event', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY)
      )
        .to.emit(whitelistedUsersDatabase, 'UserWhitelisted')
        .withArgs(userA.address, CURRENCY);
    });
  });

  describe('delistUser', function () {
    beforeEach(async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
    });

    it('delists a user', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.delistUser(userA.address, CURRENCY);
      const isWhitelisted = await whitelistedUsersDatabase.isWhitelisted(
        userA.address,
        CURRENCY
      );

      expect(isWhitelisted).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .delistUser(userA.address, CURRENCY)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });

    it('emits an event', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(whitelistedUsersDatabase.delistUser(userA.address, CURRENCY))
        .to.emit(whitelistedUsersDatabase, 'UserDelisted')
        .withArgs(userA.address, CURRENCY);
    });
  });

  describe('getUserData', function () {
    it('returns user data', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHODS
      );
      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
      const userData = await whitelistedUsersDatabase.getUserData(
        userA.address,
        CURRENCY
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.paymentMethods).to.deep.equal(PAYMENT_METHODS);
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .getUserData(userA.address, CURRENCY)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
