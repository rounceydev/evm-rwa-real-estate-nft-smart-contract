const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Load deployment info
  const networkName = network.name;
  const deploymentPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Please run deploy.js first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const yieldDistributorAddress = deploymentInfo.contracts.YieldDistributor;

  const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
  const yieldDistributor = YieldDistributor.attach(yieldDistributorAddress);

  // Deposit yield
  const amount = process.env.AMOUNT || ethers.parseEther("1"); // Default 1 ETH

  console.log(`Depositing ${ethers.formatEther(amount)} ETH as yield...`);
  
  const tx = await yieldDistributor.depositYield(amount, { value: amount });
  await tx.wait();

  console.log(`Successfully deposited ${ethers.formatEther(amount)} ETH as yield`);
  
  // Check total deposited
  const totalDeposited = await yieldDistributor.totalYieldDeposited();
  console.log(`Total yield deposited: ${ethers.formatEther(totalDeposited)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
