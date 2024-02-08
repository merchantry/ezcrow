const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MultiOwnable', function () {
  async function deployFixture() {
    const [owner, userA, userB] = await ethers.getSigners();

    const multiOwnableTest = await ethers
      .getContractFactory('MultiOwnableTest')
      .then(contract => contract.deploy());

    return { multiOwnableTest, owner, userA, userB };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { multiOwnableTest } = this;

      expect(multiOwnableTest.target).to.not.be.undefined;
    });
  });

  describe('addOwner', function () {
    it('adds a new owner', async function () {
      const { multiOwnableTest, userA } = this;

      await multiOwnableTest.addOwner(userA.address);
      const isOwner = await multiOwnableTest.isOwner(userA.address);

      expect(isOwner).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { multiOwnableTest, userA } = this;

      await expect(multiOwnableTest.connect(userA).addOwner(userA.address))
        .to.be.revertedWithCustomError(
          multiOwnableTest,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userA.address);
    });

    it('emits an event', async function () {
      const { multiOwnableTest, userA } = this;

      await expect(multiOwnableTest.addOwner(userA.address))
        .to.emit(multiOwnableTest, 'OwnerAdded')
        .withArgs(userA.address);
    });
  });

  describe('removeOwner', function () {
    beforeEach(async function () {
      const { multiOwnableTest, userA } = this;

      await multiOwnableTest.addOwner(userA.address);
    });

    it('removes an existing owner', async function () {
      const { multiOwnableTest, userA } = this;

      await multiOwnableTest.removeOwner(userA.address);
      const isOwner = await multiOwnableTest.isOwner(userA.address);

      expect(isOwner).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { multiOwnableTest, userA, userB } = this;

      await expect(multiOwnableTest.connect(userB).removeOwner(userA.address))
        .to.be.revertedWithCustomError(
          multiOwnableTest,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userB.address);
    });

    it('emits an event', async function () {
      const { multiOwnableTest, userA } = this;

      await expect(multiOwnableTest.removeOwner(userA.address))
        .to.emit(multiOwnableTest, 'OwnerRemoved')
        .withArgs(userA.address);
    });
  });

  describe('isOwner', function () {
    it('returns true for existing owner', async function () {
      const { multiOwnableTest, owner } = this;

      const isOwner = await multiOwnableTest.isOwner(owner.address);

      expect(isOwner).to.be.true;
    });

    it('returns false for non-owner', async function () {
      const { multiOwnableTest, userA } = this;

      const isOwner = await multiOwnableTest.isOwner(userA.address);

      expect(isOwner).to.be.false;
    });
  });
});
