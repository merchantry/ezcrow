const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('WhitelistedUsersDatabase', function () {
  async function deployFixture() {
    const [owner, userA, userB] = await ethers.getSigners();

    const whitelistedUsersDatabase = await ethers
      .getContractFactory('WhitelistedUsersDatabase')
      .then(contract => contract.deploy());

    return { whitelistedUsersDatabase, owner, userA, userB };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { whitelistedUsersDatabase } = this;

      expect(whitelistedUsersDatabase.target).not.to.be.undefined;
    });
  });

  describe('add', function () {
    it('whitelists a user', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.add(userA.address);
      const isWhitelisted = await whitelistedUsersDatabase.isWhitelisted(
        userA.address
      );

      expect(isWhitelisted).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(whitelistedUsersDatabase.connect(userA).add(userA.address))
        .to.be.revertedWithCustomError(
          whitelistedUsersDatabase,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userA.address);
    });

    it('emits an event', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(whitelistedUsersDatabase.add(userA.address))
        .to.emit(whitelistedUsersDatabase, 'UserAdded')
        .withArgs(userA.address);
    });

    it('reverts if user is already whitelisted', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.add(userA.address);

      await expect(whitelistedUsersDatabase.add(userA.address))
        .to.be.revertedWithCustomError(
          whitelistedUsersDatabase,
          'UserAlreadyWhitelisted'
        )
        .withArgs(userA.address);
    });

    it('adds users to whitelist array', async function () {
      const { whitelistedUsersDatabase, owner, userA, userB } = this;

      await whitelistedUsersDatabase.add(owner.address);
      await whitelistedUsersDatabase.add(userA.address);
      await whitelistedUsersDatabase.add(userB.address);

      const whitelistedUsers =
        await whitelistedUsersDatabase.getWhitelistedUsers();

      expect(whitelistedUsers[0]).to.equal(owner.address);
      expect(whitelistedUsers[1]).to.equal(userA.address);
      expect(whitelistedUsers[2]).to.equal(userB.address);
    });
  });

  describe('remove', function () {
    beforeEach(async function () {
      const { whitelistedUsersDatabase, owner, userA, userB } = this;

      await whitelistedUsersDatabase.add(owner.address);
      await whitelistedUsersDatabase.add(userA.address);
      await whitelistedUsersDatabase.add(userB.address);
    });

    it('removes whitelist from user', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.remove(userA.address);
      const isWhitelisted = await whitelistedUsersDatabase.isWhitelisted(
        userA.address
      );

      expect(isWhitelisted).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(
        whitelistedUsersDatabase.connect(userA).remove(userA.address)
      )
        .to.be.revertedWithCustomError(
          whitelistedUsersDatabase,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userA.address);
    });

    it('emits an event', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await expect(whitelistedUsersDatabase.remove(userA.address))
        .to.emit(whitelistedUsersDatabase, 'UserRemoved')
        .withArgs(userA.address);
    });

    it('reverts if user is not whitelisted', async function () {
      const { whitelistedUsersDatabase, userA } = this;

      await whitelistedUsersDatabase.remove(userA.address);

      await expect(whitelistedUsersDatabase.remove(userA.address))
        .to.be.revertedWithCustomError(
          whitelistedUsersDatabase,
          'UserNotWhitelisted'
        )
        .withArgs(userA.address);
    });

    it('removes user from whitelist array', async function () {
      const { whitelistedUsersDatabase, owner, userA, userB } = this;

      await whitelistedUsersDatabase.remove(userA.address);

      const whitelistedUsers =
        await whitelistedUsersDatabase.getWhitelistedUsers();

      expect(whitelistedUsers[0]).to.equal(owner.address);
      expect(whitelistedUsers[1]).to.equal(userB.address);
    });
  });
});
