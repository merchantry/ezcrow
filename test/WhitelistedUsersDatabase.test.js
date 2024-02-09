const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const CURRENCY = 'USD';
const TELEGRAM_HANDLE = 'userA_telegram';
const PAYMENT_METHOD = 'PayPal';
const PAYMENT_DATA = 'userA_paypal@example.com';

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
    it('updates prepared user data', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );
      const userData = await whitelistedUsersDatabase.getUserPreparedData(
        userA.address,
        CURRENCY
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .updateUser(
            userA.address,
            CURRENCY,
            TELEGRAM_HANDLE,
            PAYMENT_METHOD,
            PAYMENT_DATA
          )
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
          PAYMENT_METHOD,
          PAYMENT_DATA
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

    it('copies prepared user data to user data', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );
      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
      const userData = await whitelistedUsersDatabase.getUserData(
        userA.address,
        CURRENCY,
        true
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
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
    it('returns user data with private info', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );
      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
      const userData = await whitelistedUsersDatabase.getUserData(
        userA.address,
        CURRENCY,
        true
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('returns user data without private info', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );
      await whitelistedUsersDatabase.whitelistUser(userA.address, CURRENCY);
      const userData = await whitelistedUsersDatabase.getUserData(
        userA.address,
        CURRENCY,
        false
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal('');
      expect(userData.privateData.paymentData).to.equal('');
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .getUserData(userA.address, CURRENCY, true)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });
  });

  describe('getUserPreparedData', function () {
    it('returns user prepared data', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.updateUser(
        userA.address,
        CURRENCY,
        TELEGRAM_HANDLE,
        PAYMENT_METHOD,
        PAYMENT_DATA
      );
      const userData = await whitelistedUsersDatabase.getUserPreparedData(
        userA.address,
        CURRENCY
      );

      expect(userData.user).to.equal(userA.address);
      expect(userData.currency).to.equal(CURRENCY);
      expect(userData.telegramHandle).to.equal(TELEGRAM_HANDLE);
      expect(userData.privateData.paymentMethod).to.equal(PAYMENT_METHOD);
      expect(userData.privateData.paymentData).to.equal(PAYMENT_DATA);
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase
          .connect(userA)
          .getUserPreparedData(userA.address, CURRENCY)
      ).to.be.revertedWithCustomError(
        whitelistedUsersDatabase,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
