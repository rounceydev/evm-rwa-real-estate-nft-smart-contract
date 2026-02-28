// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldDistributor
 * @notice Interface for yield distribution functionality
 */
interface IYieldDistributor {
    /**
     * @notice Deposit rental yield for distribution
     * @param amount Amount of yield to deposit (in wei for ETH or token units)
     */
    function depositYield(uint256 amount) external payable;

    /**
     * @notice Claim accumulated yield for a specific NFT token ID
     * @param tokenId The NFT token ID to claim yield for
     */
    function claimYield(uint256 tokenId) external;

    /**
     * @notice Claim yield for multiple NFT token IDs
     * @param tokenIds Array of NFT token IDs to claim yield for
     */
    function claimYieldBatch(uint256[] calldata tokenIds) external;

    /**
     * @notice Get the claimable yield amount for a specific token ID
     * @param tokenId The NFT token ID to check
     * @return The claimable yield amount
     */
    function getClaimableYield(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Get total accumulated yield for a token ID
     * @param tokenId The NFT token ID to check
     * @return The total accumulated yield
     */
    function getTotalYield(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Event emitted when yield is deposited
     */
    event YieldDeposited(address indexed depositor, uint256 amount, uint256 timestamp);

    /**
     * @notice Event emitted when yield is claimed
     */
    event YieldClaimed(address indexed claimant, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
}
