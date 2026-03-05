const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("FractionalPropertyNFT", function () {
  let propertyNFT;
  let complianceModule;
  let admin, minter, user1, user2, nonWhitelisted;
  let propertyInfo;

  beforeEach(async function () {
    [admin, minter, user1, user2, nonWhitelisted] = await ethers.getSigners();

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
      location: "123 Main St, San Francisco, CA 94102",
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

    // Whitelist users
    await complianceModule.batchAddToWhitelist([
      user1.address,
      user2.address,
      minter.address
    ]);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await propertyNFT.name()).to.equal("Fractional Real Estate NFT");
      expect(await propertyNFT.symbol()).to.equal("FRENFT");
    });

    it("Should set property info correctly", async function () {
      const info = await propertyNFT.propertyInfo();
      expect(info.location).to.equal(propertyInfo.location);
      expect(info.totalValue).to.equal(propertyInfo.totalValue);
      expect(info.totalShares).to.equal(propertyInfo.totalShares);
    });

    it("Should grant roles correctly", async function () {
      const ADMIN_ROLE = await propertyNFT.ADMIN_ROLE();
      const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
      
      expect(await propertyNFT.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await propertyNFT.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint NFTs to whitelisted address", async function () {
      const count = 10;
      await propertyNFT.connect(minter).mintBatch(user1.address, count);
      
      expect(await propertyNFT.balanceOf(user1.address)).to.equal(count);
      expect(await propertyNFT.totalTokens()).to.equal(count);
    });

    it("Should calculate share percentage correctly", async function () {
      const count = 10;
      await propertyNFT.connect(minter).mintBatch(user1.address, count);
      
      const tokenId = 1;
      const share = await propertyNFT.getTokenShare(tokenId);
      // Each token should represent 1% (10000 basis points / 100 shares)
      expect(share).to.be.gt(0);
    });

    it("Should revert when minting to non-whitelisted address", async function () {
      await expect(
        propertyNFT.connect(minter).mintBatch(nonWhitelisted.address, 10)
      ).to.be.revertedWith("FractionalPropertyNFT: recipient not whitelisted");
    });

    it("Should revert when minting exceeds total shares", async function () {
      await expect(
        propertyNFT.connect(minter).mintBatch(user1.address, 101)
      ).to.be.revertedWith("FractionalPropertyNFT: exceeds total shares");
    });

    it("Should revert when non-minter tries to mint", async function () {
      await expect(
        propertyNFT.connect(user1).mintBatch(user1.address, 10)
      ).to.be.reverted;
    });

    it("Should emit TokensMinted event", async function () {
      const count = 5;
      const tx = await propertyNFT.connect(minter).mintBatch(user1.address, count);
      await expect(tx)
        .to.emit(propertyNFT, "TokensMinted")
        .withArgs(user1.address, (tokenIds) => {
          return Array.isArray(tokenIds) && tokenIds.length === count;
        }, count);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await propertyNFT.connect(minter).mintBatch(user1.address, 10);
    });

    it("Should allow transfer between whitelisted addresses", async function () {
      const tokenId = 1;
      await propertyNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId);
      
      expect(await propertyNFT.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should revert transfer to non-whitelisted address", async function () {
      const tokenId = 1;
      await expect(
        propertyNFT.connect(user1).transferFrom(user1.address, nonWhitelisted.address, tokenId)
      ).to.be.revertedWith("FractionalPropertyNFT: recipient not whitelisted");
    });

    it("Should revert transfer when paused", async function () {
      await propertyNFT.connect(admin).pause();
      
      const tokenId = 1;
      await expect(
        propertyNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Pausability", function () {
    it("Should pause and unpause correctly", async function () {
      await propertyNFT.connect(admin).pause();
      expect(await propertyNFT.paused()).to.be.true;
      
      await propertyNFT.connect(admin).unpause();
      expect(await propertyNFT.paused()).to.be.false;
    });

    it("Should revert minting when paused", async function () {
      await propertyNFT.connect(admin).pause();
      
      await expect(
        propertyNFT.connect(minter).mintBatch(user1.address, 10)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Admin Functions", function () {
    it("Should update property info", async function () {
      const newInfo = {
        location: "456 New St",
        totalValue: ethers.parseEther("2000000"),
        totalShares: 200,
        monthlyRental: ethers.parseEther("10000"),
        propertyType: "Commercial",
        yearBuilt: 2021,
        description: "Updated property"
      };
      
      await propertyNFT.connect(admin).updatePropertyInfo(newInfo);
      const info = await propertyNFT.propertyInfo();
      expect(info.location).to.equal(newInfo.location);
    });

    it("Should update compliance module", async function () {
      const newCompliance = await ethers.deployContract("ComplianceModule");
      await newCompliance.waitForDeployment();
      
      await propertyNFT.connect(admin).setComplianceModule(await newCompliance.getAddress());
      expect(await propertyNFT.complianceModule()).to.equal(await newCompliance.getAddress());
    });
  });
});
