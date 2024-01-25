// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { deployContract } = require('./utils/ethers');

async function main() {
  const ftpd = await deployContract('FiatTokenPairDeployer');
  const lksd = await deployContract('ListingsKeyStorageDeployer');
  const lhd = await deployContract('ListingsHandlerDeployer');
  const oksd = await deployContract('OrdersKeyStorageDeployer');
  const ohd = await deployContract('OrdersHandlerDeployer');

  const ezcrowRamp = await deployContract('EzcrowRamp');
  const fiatTokenPairHandler = await deployContract('FiatTokenPairHandler', [
    ftpd.target,
    lksd.target,
    lhd.target,
    oksd.target,
    ohd.target,
    ezcrowRamp.target,
  ]);
  await ezcrowRamp.setFiatTokenPairHandler(fiatTokenPairHandler.target);
  await deployContract('EzcrowRampQuery', [fiatTokenPairHandler.target]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
