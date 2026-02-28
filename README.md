# EVM Fractional Real Estate NFT Smart Contract

A comprehensive Solidity-based codebase for fractional real estate NFT smart contracts, inspired by RealT's tokenized real estate platform. This project enables properties to be fractionalized into tradable NFTs representing ownership shares with automated rental yield distributions.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [Deployment Guide](#deployment-guide)
- [Usage Examples](#usage-examples)
- [Contract Structure](#contract-structure)
- [Assumptions & Limitations](#assumptions--limitations)
- [Contac](#contact)

## 🎯 Project Overview

This is a simplified educational clone of RealT-style fractional real estate NFTs for Real-World Asset (RWA) ownership and yields. The protocol allows:

- **Fractional Ownership**: Properties are divided into multiple NFTs, each representing a fractional share
- **Automated Yield Distribution**: Rental income is automatically distributed to NFT holders proportionally
- **Compliance Controls**: KYC/AML whitelist system for transfers and minting
- **Upgradeability**: UUPS proxy pattern for future contract upgrades
- **Oracle Integration**: Mock oracle for rental income updates (replaceable with real oracle)

**⚠️ Important**: This is an educational/demonstration project. For production use, professional security audits, legal compliance review, and proper off-chain real estate integrations are required.

## ✨ Key Features

### Core Functionality

1. **Fractional NFT Minting**
   - Admin-controlled batch minting of NFTs
   - Each NFT represents a fractional ownership share (e.g., 1 NFT = 1/100th of property)
   - Rich metadata support (location, value, rental info, property type)
   - ERC-721 Enumerable standard with URI storage

2. **Yield Distribution**
   - Automated proportional distribution of rental income
   - Supports both ETH and ERC-20 token yields
   - Claimable yield mechanism (pull model)
   - Batch claiming for multiple NFTs
   - Real-time yield tracking per NFT

3. **Compliance & Whitelist**
   - KYC/AML whitelist management
   - Transfer restrictions (only whitelisted addresses can receive NFTs)
   - Role-based access control (ADMIN, COMPLIANCE, MINTER, ORACLE)
   - Batch whitelist operations

4. **Oracle Integration**
   - Mock oracle contract for rental income updates
   - Periodic rental data updates
   - Extensible for real oracle integration

5. **Upgradeability**
   - UUPS (Universal Upgradeable Proxy Standard) pattern
   - Admin-controlled upgrades
   - Preserves state during upgrades

6. **Pausability**
   - Emergency pause functionality
   - Pause transfers, minting, and yield claims
   - Admin-controlled pause/unpause

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FractionalPropertyNFT                     │
│  (ERC-721 Enumerable, Upgradeable, Pausable)                │
│  - Batch minting                                            │
│  - Property metadata                                        │
│  - Share percentage tracking                                │
│  - Compliance checks on transfer                            │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ uses
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ComplianceModule                          │
│  (Upgradeable, AccessControl)                               │
│  - Whitelist management                                     │
│  - KYC/AML checks                                           │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    YieldDistributor                          │
│  (Upgradeable, Pausable, ReentrancyGuard)                   │
│  - Yield deposit (ETH/ERC-20)                                │
│  - Proportional distribution                                │
│  - Claimable yield tracking                                 │
│  - Batch claiming                                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ reads from
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FractionalPropertyNFT                     │
│  (for ownership and share calculation)                       │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MockOracle                                │
│  (AccessControl)                                            │
│  - Rental income updates                                    │
│  - Property data management                                 │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MockRentalToken                           │
│  (ERC-20)                                                   │
│  - Test token for ERC-20 yield distribution                 │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd evm-rwa-real-estate-nft
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables** (optional, for testnet deployment):
   ```bash
   cp .env.example .env
   # Edit .env with your keys
   ```

4. **Compile contracts**:
   ```bash
   npm run compile
   # or
   npx hardhat compile
   ```

## 🧪 Running Tests

Run the comprehensive test suite:

```bash
npm test
# or
npx hardhat test
```

### Test Coverage

The test suite includes:

- **Unit Tests**:
  - `FractionalPropertyNFT.test.js` - NFT minting, transfers, metadata
  - `YieldDistributor.test.js` - Yield deposit, distribution, claiming
  - `ComplianceModule.test.js` - Whitelist management
  - `MockOracle.test.js` - Oracle updates

- **Integration Tests**:
  - `integration.test.js` - Full workflow testing (mint → deposit → claim)

### Test Coverage Report

```bash
npm run test:coverage
# or
npx hardhat coverage
```

## 📦 Deployment Guide

### Local Deployment

1. **Start local Hardhat node**:
   ```bash
   npx hardhat node
   ```

2. **Deploy contracts** (in a new terminal):
   ```bash
   npm run deploy:local
   # or
   npx hardhat run scripts/deploy.js --network localhost
   ```

### Testnet Deployment (Sepolia)

1. **Configure network** in `hardhat.config.js` and `.env`:
   ```javascript
   sepolia: {
     url: process.env.SEPOLIA_RPC_URL,
     accounts: [process.env.PRIVATE_KEY]
   }
   ```

2. **Deploy to Sepolia**:
   ```bash
   npm run deploy:sepolia
   # or
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. **Verify contracts** (optional):
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
   ```

### Deployment Output

Deployment information is saved to `deployments/<network>.json`:

```json
{
  "network": "localhost",
  "contracts": {
    "ComplianceModule": "0x...",
    "FractionalPropertyNFT": "0x...",
    "YieldDistributor": "0x...",
    "MockOracle": "0x...",
    "MockRentalToken": "0x..."
  },
  "roles": {
    "admin": "0x...",
    "minter": "0x...",
    "oracle": "0x..."
  }
}
```

## 💡 Usage Examples

### 1. Mint NFTs

```javascript
const { ethers } = require("hardhat");

// Load deployed contract
const propertyNFT = await ethers.getContractAt(
  "FractionalPropertyNFT",
  "<DEPLOYED_ADDRESS>"
);

// Mint 10 NFTs to an address (must be whitelisted)
const minter = await ethers.getSigner("<MINTER_ADDRESS>");
await propertyNFT.connect(minter).mintBatch("<RECIPIENT_ADDRESS>", 10);
```

Or use the script:
```bash
RECIPIENT=0x... COUNT=10 npx hardhat run scripts/mint-nfts.js --network localhost
```

### 2. Deposit Yield

```javascript
const yieldDistributor = await ethers.getContractAt(
  "YieldDistributor",
  "<DEPLOYED_ADDRESS>"
);

// Deposit 1 ETH as rental yield
await yieldDistributor.depositYield(ethers.parseEther("1"), {
  value: ethers.parseEther("1")
});
```

Or use the script:
```bash
AMOUNT=1000000000000000000 npx hardhat run scripts/deposit-yield.js --network localhost
```

### 3. Claim Yield

```javascript
// Claim yield for a specific NFT
await yieldDistributor.connect(owner).claimYield(tokenId);

// Or claim for multiple NFTs
await yieldDistributor.connect(owner).claimYieldBatch([1, 2, 3, 4, 5]);

// Check claimable yield
const claimable = await yieldDistributor.getClaimableYield(tokenId);
console.log("Claimable:", ethers.formatEther(claimable), "ETH");
```

### 4. Manage Whitelist

```javascript
const complianceModule = await ethers.getContractAt(
  "ComplianceModule",
  "<DEPLOYED_ADDRESS>"
);

// Add to whitelist
await complianceModule.connect(compliance).addToWhitelist(address);

// Batch add
await complianceModule.connect(compliance).batchAddToWhitelist([
  address1,
  address2,
  address3
]);

// Remove from whitelist
await complianceModule.connect(compliance).removeFromWhitelist(address);
```

### 5. Update Property Info

```javascript
const newPropertyInfo = {
  location: "456 New St, New York, NY 10001",
  totalValue: ethers.parseEther("2000000"),
  totalShares: 200,
  monthlyRental: ethers.parseEther("10000"),
  propertyType: "Commercial",
  yearBuilt: 2021,
  description: "Updated property description"
};

await propertyNFT.connect(admin).updatePropertyInfo(newPropertyInfo);
```

## 📁 Contract Structure

```
contracts/
├── interfaces/
│   ├── IPropertyMetadata.sol      # Property metadata structure
│   ├── IYieldDistributor.sol      # Yield distribution interface
│   ├── IComplianceModule.sol      # Compliance interface
│   └── IMockOracle.sol            # Oracle interface
├── FractionalPropertyNFT.sol      # Main NFT contract
├── YieldDistributor.sol           # Yield distribution contract
├── ComplianceModule.sol           # Whitelist management
└── mocks/
    ├── MockOracle.sol             # Mock oracle for testing
    └── MockRentalToken.sol        # Mock ERC-20 for yields

scripts/
├── deploy.js                      # Main deployment script
├── mint-nfts.js                   # NFT minting script
├── deposit-yield.js               # Yield deposit script
└── helpers/
    └── config.js                  # Configuration helper

test/
├── FractionalPropertyNFT.test.js  # NFT contract tests
├── YieldDistributor.test.js       # Yield distributor tests
├── ComplianceModule.test.js       # Compliance tests
├── MockOracle.test.js             # Oracle tests
└── integration.test.js            # Integration tests
```

## ⚠️ Assumptions & Limitations

### Current Limitations

1. **Off-Chain Property Backing**: No actual real estate ownership is represented. This is a demonstration of the tokenization mechanism only.

2. **Mock Oracles**: Uses mock oracle contracts. Real deployments require integration with trusted oracle services (Chainlink, etc.).

3. **Simplified Yield Calculation**: Yield distribution uses a simple proportional model. Real implementations may require more complex calculations.

4. **Gas Optimization**: Some functions (e.g., `_distributeYield`) iterate through all tokens, which may be gas-intensive for large token counts. Production implementations should optimize this.

5. **No Governance Voting**: Basic governance is mentioned but not fully implemented. Real implementations would include voting mechanisms for property management decisions.

6. **Educational Purpose**: This codebase is for educational/demonstration purposes. **Not production-ready** without:
   - Professional security audits
   - Legal compliance review
   - Proper off-chain integrations
   - Regulatory approvals

### Assumptions

- Property metadata is stored on-chain or in IPFS
- Rental income is deposited manually or via oracle
- Whitelist management is handled by compliance officers
- All participants understand the risks of fractional ownership

## 🙏 Acknowledgments

- Inspired by [RealT](https://realt.co/) - Tokenized Real Estate Platform
- Built with [Hardhat](https://hardhat.org/)
- Uses [OpenZeppelin](https://www.openzeppelin.com/) contracts for security

## 📞 Support

- telegram: https://t.me/rouncey
- twitter:  https://x.com/rouncey_
