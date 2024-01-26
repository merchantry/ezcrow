```
git clone https://github.com/merchantry/ezcrow.git
cd ezcrow
npm install
npm run test
```

## **Available Tasks**

```
acceptOrder           Generates a signature for accepting an order
addCurrencySettings   Adds currency settings to EzcrowRamp
addToken              Adds a token to the list of accepted tokens on EzcrowRamp
createListing         Creates a listing
getListings           Prints listings for the given token and currency
createOrder           Creates an order
getListings           Prints listings for the given token and currency
getOrders             Prints orders for the given token and currency
getTokens             Prints the list of accepted tokens on EzcrowRamp
rejectOrder           Generates a signature for rejecting an order
whitelist             Whitelists an address

```

## **Deployment**

Deploys the following contracts and saves the addresses in `./addresses.json`:

- FiatTokenPairDeployer
- ListingsKeyStorageDeployer
- ListingsHandlerDeployer
- OrdersKeyStorageDeployer
- OrdersHandlerDeployer
- EzcrowRamp
- FiatTokenPairHandler
- EzcrowRampQuery

```
npm run deploy -- --network <NETWORK>

example:

npm run deploy -- --network telostest
```

## addCurrencySettings

```
npm run hardhat -- --network <NETWORK> addCurrencySettings --symbol <STRING> --decimals <STRING> --listingids <STRING> --orderids <STRING>

example:

npm run hardhat -- --network telostest addCurrencySettings --symbol USD --decimals 3 --listingids BTC:100,USDT:200,USDC:300 --orderids BTC:100,USDT:200,USDC:300
```

OPTIONS:

```
--symbol The symbol of the currency
--decimals The decimals of the currency
--listingids Initial listing ids for the currency
--orderids Initial order ids for the currency
```

addCurrencySettings: Adds currency settings to EzcrowRamp

## addToken

```
npm run hardhat -- --network <NETWORK> addToken --address <STRING> --listingids <STRING> --orderids <STRING>

example:

npm run hardhat -- --network telostest addToken --address 0xF3136b01c3b9d27d778C6E3387861d0A0Cfd7474 --listingids USD:100,EUR:200,INR:300 --orderids USD:100,EUR:200,INR:300
```

OPTIONS:

```
--address The address of the token
--listingids Initial listing ids for the token
--orderids Initial order ids for the token
```

addToken: Adds a token to the list of accepted tokens on EzcrowRamp

## Testing

```
npm run test
```
