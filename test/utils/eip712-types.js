const mapValues = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
const formatType = schema =>
  Object.entries(schema).map(([name, type]) => ({ name, type }));

module.exports = mapValues(
  {
    EIP712Domain: {
      name: 'string',
      version: 'string',
      chainId: 'uint256',
      verifyingContract: 'address',
      salt: 'bytes32',
    },
    OrderActionPermit: {
      owner: 'address',
      tokenSymbol: 'string',
      currencySymbol: 'string',
      orderId: 'uint256',
      accept: 'bool',
      nonce: 'uint256',
    },
  },
  formatType
);
module.exports.formatType = formatType;
