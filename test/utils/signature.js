const { ethers } = require('hardhat');
const { getDomain } = require('./eip712');

const signData = (signer, contract, types, message) =>
  getDomain(contract)
    .then(domain => signer.signTypedData(domain, types, message))
    .then(ethers.Signature.from);

module.exports = {
  signData,
};
