// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IComplianceModule.sol";

/**
 * @title ComplianceModule
 * @notice Manages KYC/AML whitelist for compliance restrictions
 * @dev Implements whitelist functionality for controlling transfers and minting
 */
contract ComplianceModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IComplianceModule
{
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @dev Mapping to track whitelisted addresses
    mapping(address => bool) private _whitelist;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the compliance module
     * @param admin Address to grant admin role
     * @param compliance Address to grant compliance role
     */
    function initialize(address admin, address compliance) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, compliance);
        _setRoleAdmin(COMPLIANCE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
    }

    /**
     * @notice Add address to whitelist
     * @param account Address to whitelist
     */
    function addToWhitelist(address account) external onlyRole(COMPLIANCE_ROLE) {
        require(account != address(0), "ComplianceModule: zero address");
        require(!_whitelist[account], "ComplianceModule: already whitelisted");
        
        _whitelist[account] = true;
        emit WhitelistAdded(account);
    }

    /**
     * @notice Remove address from whitelist
     * @param account Address to remove from whitelist
     */
    function removeFromWhitelist(address account) external onlyRole(COMPLIANCE_ROLE) {
        require(_whitelist[account], "ComplianceModule: not whitelisted");
        
        _whitelist[account] = false;
        emit WhitelistRemoved(account);
    }

    /**
     * @notice Batch add addresses to whitelist
     * @param accounts Array of addresses to whitelist
     */
    function batchAddToWhitelist(address[] calldata accounts) external onlyRole(COMPLIANCE_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] != address(0) && !_whitelist[accounts[i]]) {
                _whitelist[accounts[i]] = true;
                emit WhitelistAdded(accounts[i]);
            }
        }
    }

    /**
     * @notice Check if address is whitelisted
     * @param account Address to check
     * @return True if whitelisted, false otherwise
     */
    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    /**
     * @notice Internal function to check whitelist (for use by other contracts)
     * @param account Address to check
     * @return True if whitelisted
     */
    function _isWhitelisted(address account) internal view returns (bool) {
        return _whitelist[account];
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}
