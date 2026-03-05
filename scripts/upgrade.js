const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Script to upgrade contracts using UUPS proxy pattern
 * Usage: npx hardhat run scripts/upgrade.js --network <network> --contract <contractName>
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Please run deploy.js first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  // Get contract name from command line args or use default
  const contractName = process.env.CONTRACT || "FractionalPropertyNFT";
  const proxyAddress = deploymentInfo.contracts[contractName];

  if (!proxyAddress) {
    console.error(`Contract ${contractName} not found in deployment info.`);
    process.exit(1);
  }

  console.log(`Upgrading ${contractName} at ${proxyAddress}...`);

  // Deploy new implementation
  const ContractFactory = await ethers.getContractFactory(contractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, ContractFactory);

  console.log(`${contractName} upgraded successfully!`);
  console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
  
  // Update deployment info
  deploymentInfo.upgrades = deploymentInfo.upgrades || [];
  deploymentInfo.upgrades.push({
    contract: contractName,
    timestamp: new Date().toISOString(),
    implementation: await upgrades.erc1967.getImplementationAddress(proxyAddress)
  });

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info updated.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
