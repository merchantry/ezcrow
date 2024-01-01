const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ListingsFactory', function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const ListingsFactory = await ethers.getContractFactory('ListingsFactory');
    const factory = await ListingsFactory.deploy();

    return { factory, owner };
  }

  describe('Deployment', function () {
    it('Should deploy', async function () {
      const { factory } = await loadFixture(deployFixture);

      expect(factory.target).not.to.be.undefined;
    });
  });
});
