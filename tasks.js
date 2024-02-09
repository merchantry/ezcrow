/* eslint-disable no-console */
/* eslint-disable no-undef */

const { task } = require('hardhat/config');
const { ListingAction } = require('./test/utils/enums');
const { getDomain } = require('./test/utils/eip712');
const { OrderActionPermit } = require('./test/utils/eip712-types');
const { getDeployedContract } = require('./scripts/utils/ethers');
const { stringIdsToObject } = require('./scripts/helpers');

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

    const listings = await ezcrowRampQuery.getListings(token, currency, 500);
    console.log(listings);
  });

task('getOrders', 'Prints orders for the given token and currency')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const orders = await ezcrowRampQuery.getOrders(token, currency, 500);
    console.log(orders);
  });

task('addToken', 'Adds a token to the list of accepted tokens on EzcrowRamp')
  .addParam('address', 'The address of the token')
  .addParam(
    'listingids',
    'Initial listing ids for the token',
    undefined,
    undefined,
    true
  )
  .addParam(
    'orderids',
    'Initial order ids for the token',
    undefined,
    undefined,
    true
  )
  .setAction(async taskArgs => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const listingIds = stringIdsToObject(taskArgs.listingids);
    const orderIds = stringIdsToObject(taskArgs.orderids);

    const currencySymbols = await ezcrowRamp.getCurrencySymbols();

    for (const currencySymbol of currencySymbols) {
      if (!(currencySymbol in listingIds))
        throw new Error(`Missing listing id for ${currencySymbol}`);
      if (!(currencySymbol in orderIds))
        throw new Error(`Missing order id for ${currencySymbol}`);
    }

    const tx = await ezcrowRamp.addToken(taskArgs.address);
    await tx.wait();

    const tokenSymbol = await new ethers.Contract(taskArgs.address, [
      'function symbol() view returns (string)',
    ])
      .connect(ethers.provider)
      .symbol();

    for (const currencySymbol of currencySymbols) {
      const tx = await ezcrowRamp.connectFiatTokenPair(
        tokenSymbol,
        currencySymbols,
        listingIds[currencySymbol],
        orderIds[currencySymbol]
      );
      await tx.wait();
    }

    const tokenSymbols = await ezcrowRamp.getTokenSymbols();
    console.log('Token added! Current list of tokens:', tokenSymbols);
  });

task('addCurrencySettings', 'Adds currency settings to EzcrowRamp')
  .addParam('symbol', 'The symbol of the currency')
  .addParam('decimals', 'The decimals of the currency')
  .addParam(
    'listingids',
    'Initial listing ids for the currency',
    undefined,
    undefined,
    true
  )
  .addParam(
    'orderids',
    'Initial order ids for the currency',
    undefined,
    undefined,
    true
  )
  .setAction(async taskArgs => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const listingIds = stringIdsToObject(taskArgs.listingids);
    const orderIds = stringIdsToObject(taskArgs.orderids);

    const tokenSymbols = await ezcrowRamp.getTokenSymbols();

    for (const tokenSymbol of tokenSymbols) {
      if (!(tokenSymbol in listingIds))
        throw new Error(`Missing listing id for ${tokenSymbol}`);
      if (!(tokenSymbol in orderIds))
        throw new Error(`Missing order id for ${tokenSymbol}`);
    }

    const tx = await ezcrowRamp.addCurrencySettings(
      taskArgs.symbol,
      taskArgs.decimals
    );
    await tx.wait();

    for (const tokenSymbol of tokenSymbols) {
      const tx = await ezcrowRamp.connectFiatTokenPair(
        tokenSymbol,
        taskArgs.symbol,
        listingIds[tokenSymbol],
        orderIds[tokenSymbol]
      );
      await tx.wait();
    }

    const currencySymbols = await ezcrowRamp.getCurrencySymbols();
    console.log('Currency added! Current list of currencies:', currencySymbols);
  });

task('addValidPaymentMethod', 'Adds a valid payment method')
  .addParam('method', 'The name of the payment method')
  .setAction(async ({ method }) => {
    const wudbHandler = await getDeployedContract(
      'WhitelistedUsersDatabasHandler'
    );

    {
      const tx = await wudbHandler.addValidPaymentMethod(method);
      await tx.wait();
    }

    const paymentMethods = await whitelistDB.getAllValidPaymentMethods();
    console.log('Payment method added:', paymentMethods);
  });

task('whitelist', 'Whitelists an address')
  .addParam('address', 'The address to whitelist')
  .addParam('currency', 'The symbol of the currency to whitelist for')
  .setAction(async ({ address, currency }) => {
    const wudbHandler = await getDeployedContract(
      'WhitelistedUsersDatabasHandler'
    );

    {
      const tx = await wudbHandler.whitelistUser(address, currency);
      await tx.wait();
    }

    console.log('Address whitelisted:', address);
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

    const listings = await ezcrowRampQuery.getListings(token, currency, 10);

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

    const orders = await ezcrowRampQuery.getOrders(token, currency, 10);
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
    const network = await ethers.provider.getNetwork();

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
      network: network.name,
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
    const network = await ethers.provider.getNetwork();

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
      network: network.name,
    });
  });

task('mintToken', 'Mints test token to the given address')
  .addParam('address', 'The address to mint to')
  .addParam('amount', 'The amount of tokens to mint')
  .setAction(async ({ address, amount }) => {
    const token = await getDeployedContract('TestToken');

    const tx = await token.mint(address, BigInt(amount));
    await tx.wait();

    const balance = await token.balanceOf(address);
    console.log('Token minted! Balance:', balance.toString());
  });
