// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IMockOracle.sol";

/**
 * @title MockOracle
 * @notice Mock oracle contract for simulating rental income updates
 * @dev In production, this would be replaced with a real oracle service
 */
contract MockOracle is AccessControl, IMockOracle {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    /// @dev Mapping from property ID to rental income
    mapping(uint256 => uint256) private rentalIncomes;

    /// @dev Reference to yield distributor for automatic distribution
    address public yieldDistributor;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    /**
     * @notice Update rental income data for a property
     * @param propertyId Property identifier
     * @param rentalAmount New rental amount
     */
    function updateRentalIncome(uint256 propertyId, uint256 rentalAmount) 
        external 
        override 
        onlyRole(ORACLE_ROLE) 
    {
        rentalIncomes[propertyId] = rentalAmount;
        emit RentalIncomeUpdated(propertyId, rentalAmount, block.timestamp);
    }

    /**
     * @notice Get current rental income for a property
     * @param propertyId Property identifier
     * @return Current rental income amount
     */
    function getRentalIncome(uint256 propertyId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return rentalIncomes[propertyId];
    }

    /**
     * @notice Set yield distributor address for automatic distribution
     */
    function setYieldDistributor(address _yieldDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldDistributor = _yieldDistributor;
    }

    /**
     * @notice Update rental income and automatically deposit to yield distributor
     * @param propertyId Property identifier
     * @param rentalAmount New rental amount
     */
    function updateRentalIncomeAndDistribute(
        uint256 propertyId, 
        uint256 rentalAmount
    ) external onlyRole(ORACLE_ROLE) {
        updateRentalIncome(propertyId, rentalAmount);
        
        if (yieldDistributor != address(0)) {
            // In a real scenario, this would trigger the yield distributor
            // For now, this is a placeholder for the integration
        }
    }
}
