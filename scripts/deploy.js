const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, admin, minter, oracle, compliance] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Mock Rental Token (optional, for ERC-20 yield testing)
  console.log("\n1. Deploying MockRentalToken...");
  const MockRentalToken = await ethers.getContractFactory("MockRentalToken");
  const mockRentalToken = await MockRentalToken.deploy(deployer.address);
  await mockRentalToken.waitForDeployment();
  const mockRentalTokenAddress = await mockRentalToken.getAddress();
  console.log("MockRentalToken deployed to:", mockRentalTokenAddress);

  // Deploy ComplianceModule (UUPS)
  console.log("\n2. Deploying ComplianceModule (UUPS)...");
  const ComplianceModule = await ethers.getContractFactory("ComplianceModule");
  const complianceModule = await upgrades.deployProxy(
    ComplianceModule,
    [admin.address, compliance.address],
    { initializer: "initialize", kind: "uups" }
  );
  await complianceModule.waitForDeployment();
  const complianceModuleAddress = await complianceModule.getAddress();
  console.log("ComplianceModule deployed to:", complianceModuleAddress);

  // Deploy FractionalPropertyNFT (UUPS)
  console.log("\n3. Deploying FractionalPropertyNFT (UUPS)...");
  const FractionalPropertyNFT = await ethers.getContractFactory("FractionalPropertyNFT");
  
  // Property metadata
  const propertyInfo = {
    location: "123 Main St, San Francisco, CA 94102",
    totalValue: ethers.parseEther("1000000"), // 1M ETH
    totalShares: 100, // 100 NFTs = 100% ownership
    monthlyRental: ethers.parseEther("5000"), // 5000 ETH/month
    propertyType: "Residential",
    yearBuilt: 2020,
    description: "Modern residential property with fractional ownership"
  };

  const baseURI = "https://api.example.com/metadata/";

  const propertyNFT = await upgrades.deployProxy(
    FractionalPropertyNFT,
    [
      "Fractional Real Estate NFT",
      "FRENFT",
      admin.address,
      minter.address,
      complianceModuleAddress,
      propertyInfo,
      baseURI
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await propertyNFT.waitForDeployment();
  const propertyNFTAddress = await propertyNFT.getAddress();
  console.log("FractionalPropertyNFT deployed to:", propertyNFTAddress);

  // Deploy YieldDistributor (UUPS)
  console.log("\n4. Deploying YieldDistributor (UUPS)...");
  const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
  
  // Use address(0) for ETH yields, or mockRentalTokenAddress for ERC-20 yields
  const yieldTokenAddress = ethers.ZeroAddress; // Change to mockRentalTokenAddress for ERC-20

  const yieldDistributor = await upgrades.deployProxy(
    YieldDistributor,
    [
      admin.address,
      oracle.address,
      propertyNFTAddress,
      yieldTokenAddress
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await yieldDistributor.waitForDeployment();
  const yieldDistributorAddress = await yieldDistributor.getAddress();
  console.log("YieldDistributor deployed to:", yieldDistributorAddress);

  // Deploy MockOracle
  console.log("\n5. Deploying MockOracle...");
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const mockOracle = await MockOracle.deploy(admin.address);
  await mockOracle.waitForDeployment();
  const mockOracleAddress = await mockOracle.getAddress();
  console.log("MockOracle deployed to:", mockOracleAddress);

  // Setup: Add initial whitelist addresses
  console.log("\n6. Setting up whitelist...");
  const whitelistAddresses = [
    deployer.address,
    admin.address,
    minter.address,
    oracle.address,
    compliance.address
  ];
  await complianceModule.batchAddToWhitelist(whitelistAddresses);
  console.log("Whitelist addresses added:", whitelistAddresses.length);

  // Setup: Mint sample NFTs
  console.log("\n7. Minting sample NFTs...");
  const mintCount = 10; // Mint 10 NFTs to deployer
  const mintTx = await propertyNFT.connect(minter).mintBatch(deployer.address, mintCount);
  await mintTx.wait();
  console.log(`Minted ${mintCount} NFTs to ${deployer.address}`);

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      MockRentalToken: mockRentalTokenAddress,
      ComplianceModule: complianceModuleAddress,
      FractionalPropertyNFT: propertyNFTAddress,
      YieldDistributor: yieldDistributorAddress,
      MockOracle: mockOracleAddress
    },
    roles: {
      admin: admin.address,
      minter: minter.address,
      oracle: oracle.address,
      compliance: compliance.address
    },
    propertyInfo: {
      location: propertyInfo.location,
      totalValue: propertyInfo.totalValue.toString(),
      totalShares: propertyInfo.totalShares.toString(),
      monthlyRental: propertyInfo.monthlyRental.toString()
    },
    timestamp: new Date().toISOString()
  };

  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("ComplianceModule:", complianceModuleAddress);
  console.log("FractionalPropertyNFT:", propertyNFTAddress);
  console.log("YieldDistributor:", yieldDistributorAddress);
  console.log("MockOracle:", mockOracleAddress);
  console.log("MockRentalToken:", mockRentalTokenAddress);
  console.log("\nDeployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
