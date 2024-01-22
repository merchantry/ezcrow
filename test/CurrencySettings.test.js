const {
  loadFixture,
} = require('@nomicfoundation/hardhat-toolbox/network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

const CURRENCY_SYMBOL = 'USD';
const CURRENCY_DECIMALS = 3;

describe('CurrencySettings', function () {
  async function deployFixture() {
    const [owner, otherUser] = await ethers.getSigners();

    const currencySettings = await ethers
      .getContractFactory('CurrencySettings')
      .then(contract => contract.deploy(CURRENCY_SYMBOL, CURRENCY_DECIMALS));

    return { currencySettings, owner, otherUser };
  }

  beforeEach(async function () {
    Object.assign(this, await loadFixture(deployFixture));
  });

  describe('Deployment', function () {
    it('deploys', async function () {
      const { currencySettings } = this;

      expect(currencySettings.target).not.to.be.undefined;
    });
  });

  describe('setDecimals', function () {
    it('updates decimals', async function () {
      const { currencySettings } = this;

      const newDecimals = 2;

      await currencySettings.setDecimals(newDecimals);
      const decimals = await currencySettings.decimals();

      expect(decimals).to.equal(newDecimals);
    });

    it('reverts if not accessed by owner', async function () {
      const { currencySettings, otherUser } = this;

      await expect(
        currencySettings.connect(otherUser).setDecimals(CURRENCY_DECIMALS)
      )
        .to.be.revertedWithCustomError(
          currencySettings,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(otherUser.address);
    });
  });
});
