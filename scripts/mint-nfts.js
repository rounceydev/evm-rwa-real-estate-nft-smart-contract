const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, minter] = await ethers.getSigners();
  
  // Load deployment info
  const networkName = network.name;
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Please run deploy.js first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const propertyNFTAddress = deploymentInfo.contracts.FractionalPropertyNFT;

  const FractionalPropertyNFT = await ethers.getContractFactory("FractionalPropertyNFT");
  const propertyNFT = FractionalPropertyNFT.attach(propertyNFTAddress);

  // Mint NFTs
  const recipient = process.env.RECIPIENT || deployer.address;
  const count = parseInt(process.env.COUNT || "10");

  console.log(`Minting ${count} NFTs to ${recipient}...`);
  
  const tx = await propertyNFT.connect(minter).mintBatch(recipient, count);
  await tx.wait();

  console.log(`Successfully minted ${count} NFTs to ${recipient}`);
  
  // Check token balance
  const balance = await propertyNFT.balanceOf(recipient);
  console.log(`Total NFTs owned by ${recipient}: ${balance.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
