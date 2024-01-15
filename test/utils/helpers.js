const { ListingAction } = require('./enums');

const multiplyByTenPow = (n, exp) => {
  const absExp = BigInt(Math.abs(exp));
  if (exp < 0) {
    return n / 10n ** absExp;
  }

  return n * 10n ** absExp;
};

const getOrderCurrentStatus = (order) => {
  const { statusHistory } = order;
  return Number(statusHistory[statusHistory.length - 1]);
};

const findObjectKeyByValue = (obj, value) => {
  const [key] = Object.entries(obj).find(([, v]) => v === Number(value));

  return key;
};

const getListingData = (tokenDecimals, priceDecimals) => {
  const action = ListingAction.Buy;
  const price = multiplyByTenPow(1n, priceDecimals);
  const tokenAmount = multiplyByTenPow(5000n, tokenDecimals);
  const max = multiplyByTenPow(
    price * tokenAmount,
    priceDecimals - tokenDecimals
  );
  const min = max;

  return {
    action,
    price,
    tokenAmount,
    max,
    min,
  };
};

module.exports = {
  multiplyByTenPow,
  getOrderCurrentStatus,
  findObjectKeyByValue,
  getListingData,
};
