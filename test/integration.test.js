const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Integration Tests", function () {
  let propertyNFT;
  let yieldDistributor;
  let complianceModule;
  let mockOracle;
  let admin, minter, oracle, user1, user2, depositor;

  beforeEach(async function () {
    [admin, minter, oracle, user1, user2, depositor] = await ethers.getSigners();

    // Deploy ComplianceModule
    const ComplianceModule = await ethers.getContractFactory("ComplianceModule");
    complianceModule = await upgrades.deployProxy(
      ComplianceModule,
      [admin.address, admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await complianceModule.waitForDeployment();

    // Deploy MockOracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy(admin.address);
    await mockOracle.waitForDeployment();

    // Property info
    const propertyInfo = {
      location: "123 Main St",
      totalValue: ethers.parseEther("1000000"),
      totalShares: 100,
      monthlyRental: ethers.parseEther("5000"),
      propertyType: "Residential",
      yearBuilt: 2020,
      description: "Test property"
    };

    // Deploy FractionalPropertyNFT
    const FractionalPropertyNFT = await ethers.getContractFactory("FractionalPropertyNFT");
    propertyNFT = await upgrades.deployProxy(
      FractionalPropertyNFT,
      [
        "Fractional Real Estate NFT",
        "FRENFT",
        admin.address,
        minter.address,
        await complianceModule.getAddress(),
        propertyInfo,
        "https://api.example.com/metadata/"
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await propertyNFT.waitForDeployment();

    // Deploy YieldDistributor
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    yieldDistributor = await upgrades.deployProxy(
      YieldDistributor,
      [
        admin.address,
        oracle.address,
        await propertyNFT.getAddress(),
        ethers.ZeroAddress
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await yieldDistributor.waitForDeployment();

    // Setup whitelist
    await complianceModule.batchAddToWhitelist([
      user1.address,
      user2.address,
      minter.address
    ]);
  });

  describe("Full Workflow", function () {
    it("Should complete full workflow: mint -> deposit yield -> claim", async function () {
      // Step 1: Mint NFTs
      await propertyNFT.connect(minter).mintBatch(user1.address, 30);
      await propertyNFT.connect(minter).mintBatch(user2.address, 70);
      
      expect(await propertyNFT.balanceOf(user1.address)).to.equal(30);
      expect(await propertyNFT.balanceOf(user2.address)).to.equal(70);

      // Step 2: Oracle updates rental income
      const rentalAmount = ethers.parseEther("10000");
      await mockOracle.connect(admin).updateRentalIncome(1, rentalAmount);

      // Step 3: Deposit yield
      await yieldDistributor.connect(depositor).depositYield(rentalAmount, { value: rentalAmount });
      
      expect(await yieldDistributor.totalYieldDeposited()).to.equal(rentalAmount);

      // Step 4: Users claim yield
      const user1TokenId = 1;
      const user2TokenId = 31;
      
      const user1Claimable = await yieldDistributor.getClaimableYield(user1TokenId);
      const user2Claimable = await yieldDistributor.getClaimableYield(user2TokenId);
      
      expect(user1Claimable).to.be.gt(0);
      expect(user2Claimable).to.be.gt(0);
      // user2 should have more claimable (70% vs 30%)
      expect(user2Claimable).to.be.gt(user1Claimable);

      // Claim yields
      await yieldDistributor.connect(user1).claimYield(user1TokenId);
      await yieldDistributor.connect(user2).claimYield(user2TokenId);

      // Verify claims
      expect(await yieldDistributor.getClaimableYield(user1TokenId)).to.equal(0);
      expect(await yieldDistributor.getClaimableYield(user2TokenId)).to.equal(0);
    });

    it("Should handle transfer with compliance check", async function () {
      // Mint and setup
      await propertyNFT.connect(minter).mintBatch(user1.address, 10);
      
      // Transfer should work between whitelisted addresses
      await propertyNFT.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await propertyNFT.ownerOf(1)).to.equal(user2.address);

      // Remove user2 from whitelist
      await complianceModule.connect(admin).removeFromWhitelist(user2.address);
      
      // Transfer should fail
      await expect(
        propertyNFT.connect(user2).transferFrom(user2.address, user1.address, 1)
      ).to.be.revertedWith("FractionalPropertyNFT: recipient not whitelisted");
    });

    it("Should handle pause/unpause across contracts", async function () {
      // Mint NFTs
      await propertyNFT.connect(minter).mintBatch(user1.address, 10);
      
      // Deposit yield
      await yieldDistributor.connect(depositor).depositYield(
        ethers.parseEther("1000"),
        { value: ethers.parseEther("1000") }
      );

      // Pause NFT transfers
      await propertyNFT.connect(admin).pause();
      await expect(
        propertyNFT.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.revertedWith("Pausable: paused");

      // Pause yield claims
      await yieldDistributor.connect(admin).pause();
      await expect(
        yieldDistributor.connect(user1).claimYield(1)
      ).to.be.revertedWith("Pausable: paused");

      // Unpause
      await propertyNFT.connect(admin).unpause();
      await yieldDistributor.connect(admin).unpause();
      
      // Operations should work again
      await propertyNFT.connect(user1).transferFrom(user1.address, user2.address, 1);
      await yieldDistributor.connect(user1).claimYield(2);
    });
  });
});
