const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("YieldDistributor", function () {
  let yieldDistributor;
  let propertyNFT;
  let complianceModule;
  let admin, oracle, user1, user2, depositor;
  let propertyInfo;

  beforeEach(async function () {
    [admin, oracle, user1, user2, depositor] = await ethers.getSigners();

    // Deploy ComplianceModule
    const ComplianceModule = await ethers.getContractFactory("ComplianceModule");
    complianceModule = await upgrades.deployProxy(
      ComplianceModule,
      [admin.address, admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await complianceModule.waitForDeployment();

    // Property info
    propertyInfo = {
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
        admin.address,
        await complianceModule.getAddress(),
        propertyInfo,
        "https://api.example.com/metadata/"
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await propertyNFT.waitForDeployment();

    // Whitelist users
    await complianceModule.batchAddToWhitelist([
      user1.address,
      user2.address,
      admin.address
    ]);

    // Mint NFTs
    await propertyNFT.connect(admin).mintBatch(user1.address, 50); // 50% ownership
    await propertyNFT.connect(admin).mintBatch(user2.address, 50); // 50% ownership

    // Deploy YieldDistributor
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    yieldDistributor = await upgrades.deployProxy(
      YieldDistributor,
      [
        admin.address,
        oracle.address,
        await propertyNFT.getAddress(),
        ethers.ZeroAddress // ETH yields
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await yieldDistributor.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set correct roles", async function () {
      const ADMIN_ROLE = await yieldDistributor.ADMIN_ROLE();
      const ORACLE_ROLE = await yieldDistributor.ORACLE_ROLE();
      
      expect(await yieldDistributor.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await yieldDistributor.hasRole(ORACLE_ROLE, oracle.address)).to.be.true;
    });

    it("Should link to property NFT correctly", async function () {
      expect(await yieldDistributor.propertyNFT()).to.equal(await propertyNFT.getAddress());
    });
  });

  describe("Yield Deposit", function () {
    it("Should deposit ETH yield and distribute proportionally", async function () {
      const depositAmount = ethers.parseEther("10");
      
      const tx = await yieldDistributor.connect(depositor).depositYield(depositAmount, { value: depositAmount });
      await expect(tx)
        .to.emit(yieldDistributor, "YieldDeposited")
        .withArgs(depositor.address, depositAmount, (timestamp) => timestamp > 0);

      expect(await yieldDistributor.totalYieldDeposited()).to.equal(depositAmount);
    });

    it("Should calculate claimable yield correctly", async function () {
      const depositAmount = ethers.parseEther("10");
      await yieldDistributor.connect(depositor).depositYield(depositAmount, { value: depositAmount });

      // Each user has 50 NFTs, so each should get 50% of yield
      const user1Claimable = await yieldDistributor.getClaimableYield(1);
      const user2Claimable = await yieldDistributor.getClaimableYield(51);
      
      expect(user1Claimable).to.be.gt(0);
      expect(user2Claimable).to.be.gt(0);
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(
        yieldDistributor.connect(depositor).depositYield(0, { value: 0 })
      ).to.be.revertedWith("YieldDistributor: amount must be greater than 0");
    });

    it("Should revert deposit when paused", async function () {
      await yieldDistributor.connect(admin).pause();
      
      const depositAmount = ethers.parseEther("10");
      await expect(
        yieldDistributor.connect(depositor).depositYield(depositAmount, { value: depositAmount })
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Yield Claiming", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("10");
      await yieldDistributor.connect(depositor).depositYield(depositAmount, { value: depositAmount });
    });

    it("Should allow token owner to claim yield", async function () {
      const tokenId = 1;
      const claimableBefore = await yieldDistributor.getClaimableYield(tokenId);
      
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await yieldDistributor.connect(user1).claimYield(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.be.closeTo(claimableBefore, ethers.parseEther("0.001"));
    });

    it("Should revert claim by non-owner", async function () {
      const tokenId = 1;
      await expect(
        yieldDistributor.connect(user2).claimYield(tokenId)
      ).to.be.revertedWith("YieldDistributor: not token owner");
    });

    it("Should allow batch claiming", async function () {
      const tokenIds = [1, 2, 3, 4, 5];
      const claimableBefore = await yieldDistributor.getClaimableYield(1);
      
      await yieldDistributor.connect(user1).claimYieldBatch(tokenIds);
      
      const claimableAfter = await yieldDistributor.getClaimableYield(1);
      expect(claimableAfter).to.equal(0);
    });

    it("Should update claimed yield tracking", async function () {
      const tokenId = 1;
      const claimable = await yieldDistributor.getClaimableYield(tokenId);
      
      await yieldDistributor.connect(user1).claimYield(tokenId);
      
      const totalYield = await yieldDistributor.getTotalYield(tokenId);
      const claimed = await yieldDistributor.claimedYield(tokenId);
      
      expect(claimed).to.equal(claimable);
      expect(await yieldDistributor.totalYieldClaimed()).to.be.gt(0);
    });

    it("Should revert claim when paused", async function () {
      await yieldDistributor.connect(admin).pause();
      
      const tokenId = 1;
      await expect(
        yieldDistributor.connect(user1).claimYield(tokenId)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero yield deposit gracefully", async function () {
      // This should revert
      await expect(
        yieldDistributor.connect(depositor).depositYield(0, { value: 0 })
      ).to.be.reverted;
    });

    it("Should handle claim with no yield", async function () {
      const tokenId = 1;
      await expect(
        yieldDistributor.connect(user1).claimYield(tokenId)
      ).to.be.revertedWith("YieldDistributor: no yield to claim");
    });

    it("Should distribute yield correctly with single NFT holder", async function () {
      // Create new property with single holder
      const newPropertyNFT = await ethers.getContractFactory("FractionalPropertyNFT");
      const newNFT = await upgrades.deployProxy(
        newPropertyNFT,
        [
          "Test NFT",
          "TEST",
          admin.address,
          admin.address,
          await complianceModule.getAddress(),
          { ...propertyInfo, totalShares: 1 },
          "https://api.example.com/"
        ],
        { initializer: "initialize", kind: "uups" }
      );
      await newNFT.waitForDeployment();

      await newNFT.connect(admin).mintBatch(user1.address, 1);

      const newDistributor = await ethers.getContractFactory("YieldDistributor");
      const distributor = await upgrades.deployProxy(
        newDistributor,
        [
          admin.address,
          oracle.address,
          await newNFT.getAddress(),
          ethers.ZeroAddress
        ],
        { initializer: "initialize", kind: "uups" }
      );
      await distributor.waitForDeployment();

      const depositAmount = ethers.parseEther("1");
      await distributor.connect(depositor).depositYield(depositAmount, { value: depositAmount });

      const claimable = await distributor.getClaimableYield(1);
      expect(claimable).to.equal(depositAmount);
    });
  });
});
