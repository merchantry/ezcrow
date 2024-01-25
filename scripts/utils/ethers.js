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
  const contract = await ethers.deployContract(contractName, args);
  await contract.waitForDeployment();
  // eslint-disable-next-line no-console
  console.log(`${contractName} deployed at ${contract.target}`);
  await updateContractAddress(contractName, contract.target);
  return contract;
}

module.exports = {
  getDeployedContract,
  deployContract,
};
