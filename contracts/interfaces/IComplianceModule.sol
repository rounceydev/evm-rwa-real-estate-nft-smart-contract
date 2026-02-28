// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IComplianceModule
 * @notice Interface for compliance and whitelist management
 */
interface IComplianceModule {
    /**
     * @notice Add address to whitelist
     * @param account Address to whitelist
     */
    function addToWhitelist(address account) external;

    /**
     * @notice Remove address from whitelist
     * @param account Address to remove from whitelist
     */
    function removeFromWhitelist(address account) external;

    /**
     * @notice Batch add addresses to whitelist
     * @param accounts Array of addresses to whitelist
     */
    function batchAddToWhitelist(address[] calldata accounts) external;

    /**
     * @notice Check if address is whitelisted
     * @param account Address to check
     * @return True if whitelisted, false otherwise
     */
    function isWhitelisted(address account) external view returns (bool);

    /**
     * @notice Event emitted when address is added to whitelist
     */
    event WhitelistAdded(address indexed account);

    /**
     * @notice Event emitted when address is removed from whitelist
     */
    event WhitelistRemoved(address indexed account);
}
