// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IYieldDistributor.sol";
import "./FractionalPropertyNFT.sol";

/**
 * @title YieldDistributor
 * @notice Distributes rental yield to NFT holders proportionally based on their ownership shares
 * @dev Supports both ETH and ERC-20 token distributions
 */
contract YieldDistributor is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IYieldDistributor
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    /// @dev Reference to the FractionalPropertyNFT contract
    FractionalPropertyNFT public propertyNFT;

    /// @dev ERC-20 token for yield distribution (address(0) for ETH)
    IERC20 public yieldToken;

    /// @dev Mapping from token ID to accumulated yield
    mapping(uint256 => uint256) public accumulatedYield;

    /// @dev Mapping from token ID to claimed yield
    mapping(uint256 => uint256) public claimedYield;

    /// @dev Total yield deposited
    uint256 public totalYieldDeposited;

    /// @dev Total yield claimed
    uint256 public totalYieldClaimed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the YieldDistributor contract
     * @param admin Address to grant admin role
     * @param oracle Address to grant oracle role
     * @param _propertyNFT Address of FractionalPropertyNFT contract
     * @param _yieldToken Address of ERC-20 token for yields (address(0) for ETH)
     */
    function initialize(
        address admin,
        address oracle,
        address _propertyNFT,
        address _yieldToken
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, oracle);
        _grantRole(DEPOSITOR_ROLE, admin);
        _setRoleAdmin(ORACLE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DEPOSITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        propertyNFT = FractionalPropertyNFT(_propertyNFT);
        if (_yieldToken != address(0)) {
            yieldToken = IERC20(_yieldToken);
        }
    }

    /**
     * @notice Deposit rental yield for distribution
     * @param amount Amount of yield to deposit
     */
    function depositYield(uint256 amount) external payable override whenNotPaused {
        require(amount > 0, "YieldDistributor: amount must be greater than 0");
        
        uint256 receivedAmount;
        if (address(yieldToken) == address(0)) {
            // ETH deposit
            require(msg.value == amount, "YieldDistributor: ETH amount mismatch");
            receivedAmount = msg.value;
        } else {
            // ERC-20 deposit
            require(msg.value == 0, "YieldDistributor: no ETH expected");
            yieldToken.safeTransferFrom(msg.sender, address(this), amount);
            receivedAmount = amount;
        }

        totalYieldDeposited += receivedAmount;
        _distributeYield(receivedAmount);
        
        emit YieldDeposited(msg.sender, receivedAmount, block.timestamp);
    }

    /**
     * @notice Internal function to distribute yield proportionally to all NFT holders
     * @param amount Total yield amount to distribute
     */
    function _distributeYield(uint256 amount) internal {
        uint256 totalSupply = propertyNFT.totalSupply();
        if (totalSupply == 0) {
            return;
        }

        // Distribute proportionally based on share percentage
        // sharePercentage is stored in basis points with 18 decimal precision (10000 * 1e18 = 100%)
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (propertyNFT.ownerOf(i) != address(0)) {
                uint256 sharePercentage = propertyNFT.getTokenShare(i);
                // Calculate yield: amount * (sharePercentage / (10000 * 1e18))
                uint256 tokenYield = (amount * sharePercentage) / (10000 * 1e18);
                accumulatedYield[i] += tokenYield;
            }
        }
    }

    /**
     * @notice Claim accumulated yield for a specific NFT token ID
     * @param tokenId The NFT token ID to claim yield for
     */
    function claimYield(uint256 tokenId) external override nonReentrant whenNotPaused {
        require(
            propertyNFT.ownerOf(tokenId) == msg.sender,
            "YieldDistributor: not token owner"
        );

        uint256 claimable = getClaimableYield(tokenId);
        require(claimable > 0, "YieldDistributor: no yield to claim");

        claimedYield[tokenId] += claimable;
        totalYieldClaimed += claimable;

        if (address(yieldToken) == address(0)) {
            // Transfer ETH
            (bool success, ) = payable(msg.sender).call{value: claimable}("");
            require(success, "YieldDistributor: ETH transfer failed");
        } else {
            // Transfer ERC-20
            yieldToken.safeTransfer(msg.sender, claimable);
        }

        emit YieldClaimed(msg.sender, tokenId, claimable, block.timestamp);
    }

    /**
     * @notice Claim yield for multiple NFT token IDs
     * @param tokenIds Array of NFT token IDs to claim yield for
     */
    function claimYieldBatch(uint256[] calldata tokenIds) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
    {
        require(tokenIds.length > 0, "YieldDistributor: empty array");
        
        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(
                propertyNFT.ownerOf(tokenId) == msg.sender,
                "YieldDistributor: not token owner"
            );

            uint256 claimable = getClaimableYield(tokenId);
            if (claimable > 0) {
                claimedYield[tokenId] += claimable;
                totalClaimable += claimable;
                emit YieldClaimed(msg.sender, tokenId, claimable, block.timestamp);
            }
        }

        require(totalClaimable > 0, "YieldDistributor: no yield to claim");
        totalYieldClaimed += totalClaimable;

        if (address(yieldToken) == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: totalClaimable}("");
            require(success, "YieldDistributor: ETH transfer failed");
        } else {
            yieldToken.safeTransfer(msg.sender, totalClaimable);
        }
    }

    /**
     * @notice Get the claimable yield amount for a specific token ID
     * @param tokenId The NFT token ID to check
     * @return The claimable yield amount
     */
    function getClaimableYield(uint256 tokenId) public view override returns (uint256) {
        uint256 total = accumulatedYield[tokenId];
        uint256 claimed = claimedYield[tokenId];
        return total > claimed ? total - claimed : 0;
    }

    /**
     * @notice Get total accumulated yield for a token ID
     * @param tokenId The NFT token ID to check
     * @return The total accumulated yield
     */
    function getTotalYield(uint256 tokenId) external view override returns (uint256) {
        return accumulatedYield[tokenId];
    }

    /**
     * @notice Pause yield distribution and claims
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause yield distribution and claims
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Set property NFT contract address
     */
    function setPropertyNFT(address _propertyNFT) external onlyRole(ADMIN_ROLE) {
        require(_propertyNFT != address(0), "YieldDistributor: zero address");
        propertyNFT = FractionalPropertyNFT(_propertyNFT);
    }

    /**
     * @notice Set yield token address
     */
    function setYieldToken(address _yieldToken) external onlyRole(ADMIN_ROLE) {
        yieldToken = _yieldToken == address(0) ? IERC20(address(0)) : IERC20(_yieldToken);
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /**
     * @notice Receive ETH
     */
    receive() external payable {
        if (msg.value > 0 && hasRole(DEPOSITOR_ROLE, msg.sender)) {
            depositYield(msg.value);
        }
    }
}
