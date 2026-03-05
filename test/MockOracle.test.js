const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockOracle", function () {
  let mockOracle;
  let admin, oracle, user1;

  beforeEach(async function () {
    [admin, oracle, user1] = await ethers.getSigners();

    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy(admin.address);
    await mockOracle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set admin role correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await mockOracle.DEFAULT_ADMIN_ROLE();
      expect(await mockOracle.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Rental Income Updates", function () {
    it("Should update rental income", async function () {
      const propertyId = 1;
      const rentalAmount = ethers.parseEther("5000");
      
      const tx = await mockOracle.connect(admin).updateRentalIncome(propertyId, rentalAmount);
      await expect(tx)
        .to.emit(mockOracle, "RentalIncomeUpdated")
        .withArgs(propertyId, rentalAmount, (timestamp) => timestamp > 0);

      expect(await mockOracle.getRentalIncome(propertyId)).to.equal(rentalAmount);
    });

    it("Should get rental income correctly", async function () {
      const propertyId = 1;
      const rentalAmount = ethers.parseEther("10000");
      
      await mockOracle.connect(admin).updateRentalIncome(propertyId, rentalAmount);
      
      expect(await mockOracle.getRentalIncome(propertyId)).to.equal(rentalAmount);
    });

    it("Should revert when non-oracle tries to update", async function () {
      const propertyId = 1;
      const rentalAmount = ethers.parseEther("5000");
      
      await expect(
        mockOracle.connect(user1).updateRentalIncome(propertyId, rentalAmount)
      ).to.be.reverted;
    });
  });
});
