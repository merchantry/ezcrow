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

const ListingsSortBy = {
  Price: 0,
  AvailableAmount: 1,
  MinPricePerOrder: 2,
};

const SortDirection = {
  Desc: 0,
  Asc: 1,
};

const ListingsFilter = {
  All: 0,
  Buy: 1,
  Sell: 2,
};

const OrdersFilter = {
  All: 0,
  RequestSent: 1,
  AssetsConfirmed: 2,
  TokensDeposited: 3,
  PaymentSent: 4,
  Completed: 5,
  InDispute: 6,
  Cancelled: 7,
};

module.exports = {
  ListingAction,
  OrderStatus,
  ListingsSortBy,
  SortDirection,
  ListingsFilter,
  OrdersFilter,
};
