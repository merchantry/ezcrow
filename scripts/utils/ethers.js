/* eslint-disable no-undef */
const { getFileContents, writeToFile } = require('./files');

const updateContractAddress = async (contractName, address) => {
  const fileContents = JSON.parse(getFileContents('addresses.json'));
  const network = await ethers.provider.getNetwork();

  if (!(contractName in fileContents)) {
    fileContents[contractName] = {};
  }

  fileContents[contractName][network.name] = address;

  writeToFile('addresses.json', JSON.stringify(fileContents, null, 2));
};

const getContractAddress = async contractName => {
  const fileContents = JSON.parse(getFileContents('addresses.json'));
  const network = await ethers.provider.getNetwork();

  return fileContents[contractName][network.name];
};

const getDeployedContract = async (contractName, address = undefined) =>
  ethers.getContractAt(
    contractName,
    address ?? (await getContractAddress(contractName))
  );

async function deployContract(contractName, args = undefined) {
  // eslint-disable-next-line no-console
  console.log(`Deploying ${contractName}...`);
  const contract = await retryFunctionUntilSuccessful(
    async () => {
      const contract = await ethers.deployContract(contractName, args);
      await contract.waitForDeployment();
      return contract;
    },
    {
      // eslint-disable-next-line no-console
      onRetry: () => console.log(`Retrying deployment of ${contractName}...`),
      timeout: 60_000,
    }
  );
  // eslint-disable-next-line no-console
  console.log(`${contractName} deployed at ${contract.target}`);
  await updateContractAddress(contractName, contract.target);
  return contract;
}

async function retryFunctionUntilSuccessful(
  fn,
  { timeout, onRetry, proceedOnFail } = {}
) {
  let result;

  while (result === undefined) {
    result = await new Promise(resolve => {
      const t = setTimeout(() => {
        if (onRetry) onRetry();
        resolve(undefined);
      }, timeout || 5_000);

      fn()
        .then(v => {
          clearTimeout(t);
          resolve(v);
        })
        .catch(err => {
          if (proceedOnFail) {
            clearTimeout(t);
            resolve(0);
            return;
          }
          throw err;
        });
    });
  }

  return result;
}

module.exports = {
  getContractAddress,
  getDeployedContract,
  deployContract,
  retryFunctionUntilSuccessful,
};
