// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMockOracle
 * @notice Interface for mock oracle that provides rental income updates
 */
interface IMockOracle {
    /**
     * @notice Update rental income data
     * @param propertyId Property identifier
     * @param rentalAmount New rental amount
     */
    function updateRentalIncome(uint256 propertyId, uint256 rentalAmount) external;

    /**
     * @notice Get current rental income for a property
     * @param propertyId Property identifier
     * @return Current rental income amount
     */
    function getRentalIncome(uint256 propertyId) external view returns (uint256);

    /**
     * @notice Event emitted when rental income is updated
     */
    event RentalIncomeUpdated(uint256 indexed propertyId, uint256 rentalAmount, uint256 timestamp);
}
