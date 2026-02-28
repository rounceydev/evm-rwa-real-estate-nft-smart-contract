// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPropertyMetadata
 * @notice Interface for property metadata structure
 */
interface IPropertyMetadata {
    struct PropertyInfo {
        string location;        // Property address/location
        uint256 totalValue;     // Total property value in wei
        uint256 totalShares;    // Total number of fractional shares
        uint256 monthlyRental;  // Monthly rental income in wei
        string propertyType;    // e.g., "Residential", "Commercial"
        uint256 yearBuilt;      // Year the property was built
        string description;     // Additional property description
    }
}
