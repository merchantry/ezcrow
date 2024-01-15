const ListingAction = {
  Buy: 0,
  Sell: 1,
};
const OrderStatus = {
  RequestSent: 0,
  AssetsConfirmed: 1,
  TokensDeposited: 2,
  PaymentSent: 3,
  Completed: 4,
  InDispute: 5,
  Cancelled: 6,
};

module.exports = {
  ListingAction,
  OrderStatus,
};
