const { ethers } = require('hardhat');
const { getDomain } = require('./eip712');
const { OrderActionPermit } = require('./eip712-types');

const signData = (signer, contract, message) =>
  getDomain(contract)
    .then(domain =>
      signer.signTypedData(domain, { OrderActionPermit }, message)
    )
    .then(ethers.Signature.from);

module.exports = {
  signData,
};
