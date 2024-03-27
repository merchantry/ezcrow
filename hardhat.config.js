require('@nomicfoundation/hardhat-toolbox');
require('hardhat-contract-sizer');
require('dotenv').config();
require('./tasks');

const accounts = [
  process.env.MAIN_ACCOUNT_PRIVATE_KEY,
  process.env.ADD_ACCOUNT_PRIVATE_KEY,
];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  networks: {
    hardhat: {
      // allowUnlimitedContractSize: true,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts,
    },
    telostest: {
      url: 'https://testnet.telos.net/evm',
      accounts,
      chainId: 41,
    },
    telos: {
      url: 'https://mainnet.telos.net/evm',
      accounts,
      chainId: 40,
    },
    arbitrumsepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts,
      chainId: 421614,
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    runOnCompile: false,
    strict: false,
  },
};
