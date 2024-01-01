const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('EzcrowRamp', function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const EzcrowRamp = await ethers.getContractFactory('EzcrowRamp');
    const ramp = await EzcrowRamp.deploy();

    return { ramp, owner };
  }

  describe('Deployment', function () {
    it('Should deploy', async function () {
      const { ramp } = await loadFixture(deployFixture);

      expect(ramp.target).not.to.be.undefined;
    });
  });
});
