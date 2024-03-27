const { getListingData } = require('./helpers');
const { signData } = require('./signature');
const { OrderCreatePermit, OrderActionPermit } = require('./eip712-types');

async function addCurrenciesTokensAndWhitelistUser(fixture) {
  const {
    ezcrowRamp,
    whitelistedUsersDatabase,
    currencySymbols,
    tokens,
    owner,
    currencyDecimals,
    initialListingId,
    initialOrderId,
  } = fixture;

  for (const currency of currencySymbols) {
    await ezcrowRamp.addCurrencySettings(currency, currencyDecimals);
  }

  for (const token of tokens) {
    await ezcrowRamp.addToken(token.target);
  }

  for (const token of tokens) {
    const tokenSymbol = await token.symbol();

    for (const currencySymbol of currencySymbols) {
      await ezcrowRamp.connectFiatTokenPair(
        tokenSymbol,
        currencySymbol,
        initialListingId,
        initialOrderId
      );

      await whitelistedUsersDatabase.whitelistUser(
        owner.address,
        currencySymbol
      );
    }
  }
}

async function setupRampAndCreateListing(fixture) {
  const {
    ezcrowRamp,
    tokenDecimals,
    currencyDecimals,
    tokenSymbol,
    currencySymbol,
  } = fixture;

  const listingData = getListingData(tokenDecimals, currencyDecimals);
  await addCurrenciesTokensAndWhitelistUser(fixture);

  await ezcrowRamp.createListing(
    tokenSymbol,
    currencySymbol,
    listingData.action,
    listingData.price,
    listingData.tokenAmount,
    listingData.max,
    listingData.min
  );

  return listingData;
}

async function setupRampAndCreateListingAndOrder(fixture) {
  const {
    ezcrowRamp,
    orderCreator,
    tokenSymbol,
    currencySymbol,
    initialListingId,
  } = fixture;
  const listingData = await setupRampAndCreateListing(fixture);

  const { v, r, s } = await signData(
    orderCreator,
    ezcrowRamp,
    { OrderCreatePermit },
    {
      owner: orderCreator.address,
      tokenSymbol,
      currencySymbol,
      listingId: initialListingId,
      tokenAmount: listingData.tokenAmount,
      nonce: await ezcrowRamp.nonces(orderCreator.address),
    }
  );

  await ezcrowRamp
    .connect(orderCreator)
    .createOrder(
      orderCreator.address,
      tokenSymbol,
      currencySymbol,
      initialListingId,
      listingData.tokenAmount,
      v,
      r,
      s
    );

  return listingData;
}

async function advanceOrder(fixture, orderId, user, accept) {
  const { ezcrowRamp, tokenSymbol, currencySymbol } = fixture;
  const { v, r, s } = await signData(
    user,
    ezcrowRamp,
    { OrderActionPermit },
    {
      owner: user.address,
      tokenSymbol,
      currencySymbol,
      orderId,
      accept,
      nonce: await ezcrowRamp.nonces(user.address),
    }
  );

  const args = [user.address, tokenSymbol, currencySymbol, orderId, v, r, s];

  if (accept) {
    await ezcrowRamp.acceptOrder(...args);
  } else {
    await ezcrowRamp.rejectOrder(...args);
  }
}

async function setupOrderAndPutInDispute(fixture) {
  const {
    fiatTokenPairHandler,
    tokens,
    listingCreator,
    orderCreator,
    tokenSymbol,
    currencySymbol,
    initialOrderId,
  } = fixture;

  const listingData = await setupRampAndCreateListingAndOrder(fixture);

  const users = [listingCreator, orderCreator];
  const [token] = tokens;
  const fiatTokenPairAddress =
    await fiatTokenPairHandler.getFiatTokenPairAddress(
      tokenSymbol,
      currencySymbol
    );

  await token.mint(orderCreator.address, listingData.tokenAmount);
  await token
    .connect(orderCreator)
    .approve(fiatTokenPairAddress, listingData.tokenAmount);

  for (let i = 0; i < 3; i++) {
    await advanceOrder(fixture, initialOrderId, users[i % 2], true);
  }

  await advanceOrder(fixture, initialOrderId, orderCreator, false);

  return listingData;
}

module.exports = {
  addCurrenciesTokensAndWhitelistUser,
  setupRampAndCreateListing,
  setupRampAndCreateListingAndOrder,
  advanceOrder,
  setupOrderAndPutInDispute,
};
