const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { newArrayPromise, newArray } = require('./utils/helpers');

const INITIAL_ID = 512;

describe('AutoIncrementingId', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const autoIncrementingId = await ethers
      .getContractFactory('AutoIncrementingId')
      .then(contract => contract.deploy(INITIAL_ID));

    return { autoIncrementingId, owner, otherUser };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { autoIncrementingId } = this;

      expect(autoIncrementingId.target).not.to.be.undefined;
    });

    it('assigns initial id', async function () {
      const { autoIncrementingId } = this;

      expect(await autoIncrementingId.getInitial()).to.equal(INITIAL_ID);
    });

    it('initial id does not exist', async function () {
      const { autoIncrementingId } = this;

      expect(await autoIncrementingId.exists(INITIAL_ID)).to.be.false;
    });

    it('count is 0', async function () {
      const { autoIncrementingId } = this;

      expect(await autoIncrementingId.getCount()).to.equal(0);
    });
  });

  describe('getNext', function () {
    it('increments id', async function () {
      const { autoIncrementingId } = this;
      const length = 10;

      const ids = await newArrayPromise(length, async () => {
        const id = await autoIncrementingId.getCurrent();
        await autoIncrementingId.getNext();
        return id;
      });

      expect(ids).to.deep.equal(newArray(length, i => INITIAL_ID + i));
    });

    it('reverts if not accessed by owner', async function () {
      const { autoIncrementingId, otherUser } = this;

      await expect(
        autoIncrementingId.connect(otherUser).getNext()
      ).to.be.revertedWithCustomError(
        autoIncrementingId,
        'OwnableUnauthorizedAccount'
      );
    });
  });
});
