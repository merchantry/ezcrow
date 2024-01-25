/* eslint-disable no-console */
/* eslint-disable no-undef */

const { task } = require('hardhat/config');
const { ListingAction } = require('./test/utils/enums');
const { getDomain } = require('./test/utils/eip712');
const { OrderActionPermit } = require('./test/utils/eip712-types');
const { getDeployedContract } = require('./scripts/utils/ethers');

task(
  'getTokens',
  'Prints the list of accepted tokens on EzcrowRamp',
  async () => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const tokenSymbols = await ezcrowRamp.getTokenSymbols();
    console.log(tokenSymbols);
  }
);

task('getListings', 'Prints listings for the given token and currency')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const listings = await ezcrowRampQuery.getListings(token, currency);
    console.log(listings);
  });

task('getOrders', 'Prints orders for the given token and currency')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const orders = await ezcrowRampQuery.getOrders(token, currency);
    console.log(orders);
  });

task('addToken', 'Adds a token to the list of accepted tokens on EzcrowRamp')
  .addParam('address', 'The address of the token')
  .setAction(async ({ address }) => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');
    const tx = await ezcrowRamp.addToken(address);
    await tx.wait();

    const tokenSymbols = await ezcrowRamp.getTokenSymbols();
    console.log('Token added! Current list of tokens:', tokenSymbols);
  });

task('addCurrencySettings', 'Adds currency settings to EzcrowRamp')
  .addParam('symbol', 'The symbol of the currency')
  .addParam('decimals', 'The decimals of the currency')
  .setAction(async ({ symbol, decimals }) => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');
    const tx = await ezcrowRamp.addCurrencySettings(symbol, decimals);
    await tx.wait();

    const currencySymbols = await ezcrowRamp.getCurrencySymbols();
    console.log('Currency added! Current list of currencies:', currencySymbols);
  });

task(
  'connectFiatTokenPair',
  'Creates a new FiatTokenPair for the given token and currency and initializes listing and order ids'
)
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .addParam('listingid', 'Initial listing id')
  .addParam('orderid', 'Initial order id')
  .setAction(async ({ token, currency, listingid, orderid }) => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');
    const tx = await ezcrowRamp.connectFiatTokenPair(
      token,
      currency,
      listingid,
      orderid
    );
    await tx.wait();

    const fiatTokenPairHandler = await getDeployedContract(
      'FiatTokenPairHandler'
    );

    const fiatTokenPairAddress =
      await fiatTokenPairHandler.getFiatTokenPairAddress(token, currency);

    console.log('FiatTokenPair created at:', fiatTokenPairAddress);
  });

task('whitelist', 'Whitelists an address')
  .addParam('address', 'The address to whitelist')
  .setAction(async ({ address }) => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    {
      const tx = await ezcrowRamp.addUserToWhitelist(address);
      await tx.wait();
    }

    const whitelistDB = await ezcrowRamp
      .getWhitelistedUsersDatabaseAddress()
      .then(address =>
        getDeployedContract('WhitelistedUsersDatabase', address)
      );
    const whitelistedUsers = await whitelistDB.getWhitelistedUsers();
    console.log('Address whitelisted:', whitelistedUsers);
  });

task('createListing', 'Creates a listing')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .addParam('action', 'Either "buy" or "sell"')
  .addParam('price', 'The price of each token')
  .addParam('amount', 'The amount of tokens to buy or sell')
  .addParam(
    'min',
    'Minimum amount of fiat currency that can be accepted per order'
  )
  .addParam(
    'max',
    'Maximum amount of fiat currency that can be accepted per order'
  )
  .setAction(async ({ token, currency, action, price, amount, min, max }) => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const listingAction = {
      buy: ListingAction.Buy,
      sell: ListingAction.Sell,
    }[action];

    {
      const tx = await ezcrowRamp.createListing(
        token,
        currency,
        listingAction,
        BigInt(price),
        BigInt(amount),
        BigInt(min),
        BigInt(max)
      );
      await tx.wait();
    }

    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const listings = await ezcrowRampQuery.getListings(token, currency);

    console.log('Listing created! Current listings:', listings);
  });

task('createOrder', 'Creates an order')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .addParam('listingid', 'The id of the listing to buy or sell from')
  .addParam('amount', 'The amount of tokens to buy or sell')
  .setAction(async ({ token, currency, listingid, amount }) => {
    const [, orderCreator] = await ethers.getSigners();
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const tx = await ezcrowRamp
      .connect(orderCreator)
      .createOrder(token, currency, BigInt(listingid), BigInt(amount));
    await tx.wait();

    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const orders = await ezcrowRampQuery.getOrders(token, currency);
    console.log('Order created! Current orders:', orders);
  });

const signData = (signer, contract, message) =>
  getDomain(contract)
    .then(domain =>
      signer.signTypedData(domain, { OrderActionPermit }, message)
    )
    .then(ethers.Signature.from);

task('acceptOrder', 'Generates a signature for accepting an order')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .addParam('orderid', 'The id of the order to accept')
  .setAction(async ({ token, currency, orderid }) => {
    const orderId = BigInt(orderid);
    const [listingCreator] = await ethers.getSigners();
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const { v, r, s } = await signData(listingCreator, ezcrowRamp, {
      owner: listingCreator.address,
      tokenSymbol: token,
      currencySymbol: currency,
      orderId,
      accept: true,
      nonce: await ezcrowRamp.nonces(listingCreator.address),
    });

    console.log({
      owner: listingCreator.address,
      tokenSymbol: token,
      currencySymbol: currency,
      orderId,
      v,
      r,
      s,
    });
  });

task('rejectOrder', 'Generates a signature for rejecting an order')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .addParam('orderid', 'The id of the order to reject')
  .setAction(async ({ token, currency, orderid }) => {
    const orderId = BigInt(orderid);
    const [, orderCreator] = await ethers.getSigners();
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const { v, r, s } = await signData(orderCreator, ezcrowRamp, {
      owner: orderCreator.address,
      tokenSymbol: token,
      currencySymbol: currency,
      orderId,
      accept: false,
      nonce: await ezcrowRamp.nonces(orderCreator.address),
    });

    console.log({
      owner: orderCreator.address,
      tokenSymbol: token,
      currencySymbol: currency,
      orderId,
      v,
      r,
      s,
    });
  });