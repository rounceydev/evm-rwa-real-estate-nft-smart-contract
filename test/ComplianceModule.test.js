const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ComplianceModule", function () {
  let complianceModule;
  let admin, compliance, user1, user2;

  beforeEach(async function () {
    [admin, compliance, user1, user2] = await ethers.getSigners();

    const ComplianceModule = await ethers.getContractFactory("ComplianceModule");
    complianceModule = await upgrades.deployProxy(
      ComplianceModule,
      [admin.address, compliance.address],
      { initializer: "initialize", kind: "uups" }
    );
    await complianceModule.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set correct roles", async function () {
      const ADMIN_ROLE = await complianceModule.ADMIN_ROLE();
      const COMPLIANCE_ROLE = await complianceModule.COMPLIANCE_ROLE();
      
      expect(await complianceModule.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await complianceModule.hasRole(COMPLIANCE_ROLE, compliance.address)).to.be.true;
    });
  });

  describe("Whitelist Management", function () {
    it("Should add address to whitelist", async function () {
      await complianceModule.connect(compliance).addToWhitelist(user1.address);
      
      expect(await complianceModule.isWhitelisted(user1.address)).to.be.true;
    });

    it("Should remove address from whitelist", async function () {
      await complianceModule.connect(compliance).addToWhitelist(user1.address);
      await complianceModule.connect(compliance).removeFromWhitelist(user1.address);
      
      expect(await complianceModule.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should batch add addresses to whitelist", async function () {
      const addresses = [user1.address, user2.address];
      await complianceModule.connect(compliance).batchAddToWhitelist(addresses);
      
      expect(await complianceModule.isWhitelisted(user1.address)).to.be.true;
      expect(await complianceModule.isWhitelisted(user2.address)).to.be.true;
    });

    it("Should emit WhitelistAdded event", async function () {
      await expect(
        complianceModule.connect(compliance).addToWhitelist(user1.address)
      ).to.emit(complianceModule, "WhitelistAdded")
        .withArgs(user1.address);
    });

    it("Should emit WhitelistRemoved event", async function () {
      await complianceModule.connect(compliance).addToWhitelist(user1.address);
      
      await expect(
        complianceModule.connect(compliance).removeFromWhitelist(user1.address)
      ).to.emit(complianceModule, "WhitelistRemoved")
        .withArgs(user1.address);
    });

    it("Should revert when adding zero address", async function () {
      await expect(
        complianceModule.connect(compliance).addToWhitelist(ethers.ZeroAddress)
      ).to.be.revertedWith("ComplianceModule: zero address");
    });

    it("Should revert when adding already whitelisted address", async function () {
      await complianceModule.connect(compliance).addToWhitelist(user1.address);
      
      await expect(
        complianceModule.connect(compliance).addToWhitelist(user1.address)
      ).to.be.revertedWith("ComplianceModule: already whitelisted");
    });

    it("Should revert when removing non-whitelisted address", async function () {
      await expect(
        complianceModule.connect(compliance).removeFromWhitelist(user1.address)
      ).to.be.revertedWith("ComplianceModule: not whitelisted");
    });

    it("Should revert when non-compliance role tries to modify whitelist", async function () {
      await expect(
        complianceModule.connect(user1).addToWhitelist(user2.address)
      ).to.be.reverted;
    });
  });
});
