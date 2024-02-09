const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MultiOwnable', function () {
  async function deployFixture() {
    const [owner, userA, userB] = await ethers.getSigners();

    const multiOwnable = await ethers
      .getContractFactory('MultiOwnable')
      .then(contract => contract.deploy());

    return { multiOwnable, owner, userA, userB };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { multiOwnable } = this;

      expect(multiOwnable.target).to.not.be.undefined;
    });
  });

  describe('addOwner', function () {
    it('adds a new owner', async function () {
      const { multiOwnable, userA } = this;

      await multiOwnable.addOwner(userA.address);
      const isOwner = await multiOwnable.isOwner(userA.address);

      expect(isOwner).to.be.true;
    });

    it('reverts if not accessed by owner', async function () {
      const { multiOwnable, userA } = this;

      await expect(multiOwnable.connect(userA).addOwner(userA.address))
        .to.be.revertedWithCustomError(
          multiOwnable,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userA.address);
    });

    it('emits an event', async function () {
      const { multiOwnable, userA } = this;

      await expect(multiOwnable.addOwner(userA.address))
        .to.emit(multiOwnable, 'OwnerAdded')
        .withArgs(userA.address);
    });
  });

  describe('removeOwner', function () {
    beforeEach(async function () {
      const { multiOwnable, userA } = this;

      await multiOwnable.addOwner(userA.address);
    });

    it('removes an existing owner', async function () {
      const { multiOwnable, userA } = this;

      await multiOwnable.removeOwner(userA.address);
      const isOwner = await multiOwnable.isOwner(userA.address);

      expect(isOwner).to.be.false;
    });

    it('reverts if not accessed by owner', async function () {
      const { multiOwnable, userA, userB } = this;

      await expect(multiOwnable.connect(userB).removeOwner(userA.address))
        .to.be.revertedWithCustomError(
          multiOwnable,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(userB.address);
    });

    it('emits an event', async function () {
      const { multiOwnable, userA } = this;

      await expect(multiOwnable.removeOwner(userA.address))
        .to.emit(multiOwnable, 'OwnerRemoved')
        .withArgs(userA.address);
    });
  });

  describe('isOwner', function () {
    it('returns true for existing owner', async function () {
      const { multiOwnable, owner } = this;

      const isOwner = await multiOwnable.isOwner(owner.address);

      expect(isOwner).to.be.true;
    });

    it('returns false for non-owner', async function () {
      const { multiOwnable, userA } = this;

      const isOwner = await multiOwnable.isOwner(userA.address);

      expect(isOwner).to.be.false;
    });
  });
});
