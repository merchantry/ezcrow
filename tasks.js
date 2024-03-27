/* eslint-disable no-console */
/* eslint-disable no-undef */

const { task } = require('hardhat/config');
const {
  getDeployedContract,
  retryFunctionUntilSuccessful,
} = require('./scripts/utils/ethers');
const { stringIdsToObject } = require('./scripts/helpers');

task('profileUpdates').setAction(async () => {
  const wudb = await getDeployedContract('WhitelistedUsersDatabase');

  const events = (
    await wudb.queryFilter(wudb.filters.UserDataUpdated(), 0, wudb.blockNumber)
  )
    .map(event => ({
      user: event.args[0],
      currency: event.args[1],
      blockNumber: event.blockNumber,
    }))
    .sort((a, b) => a.blockNumber - b.blockNumber);

  console.log(events);
});

task(
  'getTokens',
  'Prints the list of accepted tokens on EzcrowRamp',
  async () => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const tokenSymbols = await ezcrowRamp.getTokenSymbols();
    console.log(tokenSymbols);
  }
);

task(
  'getAllTokenAddresses',
  'Prints the list of accepted token addresses on EzcrowRamp',
  async () => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const tokenAddresses = await ezcrowRamp.getAllTokenAddresses();
    console.log(tokenAddresses);
  }
);

task(
  'getCurrencies',
  'Prints the list of accepted currencies on EzcrowRamp',
  async () => {
    const ezcrowRamp = await getDeployedContract('EzcrowRamp');

    const currencySymbols = await ezcrowRamp.getCurrencySymbols();
    console.log(currencySymbols);
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

task('getListing', 'Prints listing with the given id, token and currency')
  .addParam('id', 'The id of the listing')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency, id }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const listing = await ezcrowRampQuery.getListing(token, currency, id);
    console.log(listing);
  });

task('getOrders', 'Prints orders for the given token and currency')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const orders = await ezcrowRampQuery.getOrders(token, currency, 500);
    console.log(orders);
  });

task('getOrder', 'Prints order with the given id, token and currency')
  .addParam('id', 'The id of the order')
  .addParam('token', 'The symbol of the token')
  .addParam('currency', 'The symbol of the currency')
  .setAction(async ({ token, currency, id }) => {
    const ezcrowRampQuery = await getDeployedContract('EzcrowRampQuery');

    const order = await ezcrowRampQuery.getOrder(token, currency, id);
    console.log(order);
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
      await retryFunctionUntilSuccessful(
        async () => {
          const tx = await ezcrowRamp.connectFiatTokenPair(
            tokenSymbol,
            currencySymbol,
            listingIds[currencySymbol],
            orderIds[currencySymbol]
          );
          await tx.wait();
        },
        {
          onRetry: () =>
            console.log(
              `Retrying connectFiatTokenPair ${tokenSymbol} : ${currencySymbol}...`
            ),
          proceedOnFail: true,
        }
      );
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

    {
      const tx = await ezcrowRamp.addCurrencySettings(
        taskArgs.symbol,
        taskArgs.decimals
      );
      await tx.wait();
    }

    for (const tokenSymbol of tokenSymbols) {
      await retryFunctionUntilSuccessful(
        async () => {
          const tx = await ezcrowRamp.connectFiatTokenPair(
            tokenSymbol,
            taskArgs.symbol,
            listingIds[tokenSymbol],
            orderIds[tokenSymbol]
          );
          await tx.wait();
        },
        {
          onRetry: () =>
            console.log(
              `Retrying connectFiatTokenPair ${tokenSymbol} : ${taskArgs.symbol}...`
            ),
          proceedOnFail: true,
        }
      );
    }

    const currencySymbols = await ezcrowRamp.getCurrencySymbols();
    console.log('Currency added! Current list of currencies:', currencySymbols);
  });

task('addValidPaymentMethod', 'Adds a valid payment method')
  .addParam('method', 'The name of the payment method')
  .setAction(async ({ method }) => {
    const wudbHandler = await getDeployedContract(
      'WhitelistedUsersDatabaseHandler'
    );

    {
      const tx = await wudbHandler.addValidPaymentMethod(method);
      await tx.wait();
    }

    const paymentMethods = await wudbHandler.getAllValidPaymentMethods();
    console.log('Payment method added:', paymentMethods);
  });

task('whitelist', 'Whitelists an address')
  .addParam('address', 'The address to whitelist')
  .addParam('currency', 'The symbol of the currency to whitelist for')
  .setAction(async ({ address, currency }) => {
    const wudbHandler = await getDeployedContract(
      'WhitelistedUsersDatabaseHandler'
    );

    {
      const tx = await wudbHandler.whitelistUser(address, currency);
      await tx.wait();
    }

    console.log('Address whitelisted:', address);
  });

task('addOwner', 'Adds an owner to the MultiOwnable contract')
  .addParam('address', 'The address of the owenr to add')
  .setAction(async ({ address }) => {
    const multiOwnable = await getDeployedContract('MultiOwnable');

    {
      const tx = await multiOwnable.addOwner(address);
      await tx.wait();
    }

    console.log('Owner added:', address);
  });

task('getUserData', 'Retrieves user data')
  .addParam('address', 'The address of the user')
  .addParam('currency', 'The currency of the user data')
  .setAction(async ({ address, currency }) => {
    const wudbHandler = await getDeployedContract(
      'WhitelistedUsersDatabaseHandler'
    );

    const userData = await wudbHandler.getUserData(address, currency);
    console.log(userData);
  });

task('mintToken', 'Mints test token to the given address')
  .addParam('address', 'The address to mint to')
  .addParam('amount', 'The amount of tokens to mint')
  .addParam('token', 'The address of the token')
  .setAction(async ({ address, amount, token }) => {
    const tokenContract = await getDeployedContract('TestToken', token);

    const tx = await tokenContract.mint(address, BigInt(amount));
    await tx.wait();

    const balance = await tokenContract.balanceOf(address);
    console.log('Token minted! Balance:', balance.toString());
  });
