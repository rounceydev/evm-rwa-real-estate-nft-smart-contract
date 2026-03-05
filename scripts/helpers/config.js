/**
 * Configuration helper for property details, whitelist, and yield rates
 */

const { ethers } = require("ethers");

const PROPERTY_CONFIG = {
  // Sample property 1
  property1: {
    location: "123 Main St, San Francisco, CA 94102",
    totalValue: ethers.parseEther("1000000"), // 1M ETH
    totalShares: 100, // 100 NFTs = 100% ownership
    monthlyRental: ethers.parseEther("5000"), // 5000 ETH/month
    propertyType: "Residential",
    yearBuilt: 2020,
    description: "Modern residential property with fractional ownership"
  },
  // Sample property 2
  property2: {
    location: "456 Oak Ave, New York, NY 10001",
    totalValue: ethers.parseEther("2500000"), // 2.5M ETH
    totalShares: 200, // 200 NFTs = 100% ownership
    monthlyRental: ethers.parseEther("12000"), // 12000 ETH/month
    propertyType: "Commercial",
    yearBuilt: 2018,
    description: "Commercial office building with high rental yield"
  }
};

const YIELD_RATES = {
  // Monthly yield rate in basis points (100 = 1%)
  monthlyYieldRate: 50, // 0.5% monthly
  // Annual yield rate in basis points
  annualYieldRate: 600, // 6% annual
};

const WHITELIST_TEMPLATE = [
  // Add addresses here for batch whitelisting
  // "0x1234567890123456789012345678901234567890",
];

module.exports = {
  PROPERTY_CONFIG,
  YIELD_RATES,
  WHITELIST_TEMPLATE
};
