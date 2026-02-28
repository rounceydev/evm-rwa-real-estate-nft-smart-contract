// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IPropertyMetadata.sol";
import "./ComplianceModule.sol";

/**
 * @title FractionalPropertyNFT
 * @notice ERC-721 NFT contract representing fractional ownership of real estate properties
 * @dev Each NFT represents a fractional share of a property with metadata and compliance controls
 */
contract FractionalPropertyNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IPropertyMetadata
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Reference to compliance module for whitelist checks
    ComplianceModule public complianceModule;

    /// @dev Property information
    PropertyInfo public propertyInfo;

    /// @dev Mapping from token ID to share percentage (in basis points, e.g., 100 = 1%)
    mapping(uint256 => uint256) public tokenSharePercentage;

    /// @dev Total number of tokens minted for this property
    uint256 public totalTokens;

    /// @dev Base URI for token metadata
    string private _baseTokenURI;

    /// @dev Events
    event PropertyInfoUpdated(
        string location,
        uint256 totalValue,
        uint256 totalShares,
        uint256 monthlyRental
    );
    event TokensMinted(address indexed to, uint256[] tokenIds, uint256 count);
    event ComplianceModuleUpdated(address indexed oldModule, address indexed newModule);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the FractionalPropertyNFT contract
     * @param name Token name
     * @param symbol Token symbol
     * @param admin Address to grant admin role
     * @param minter Address to grant minter role
     * @param _complianceModule Address of compliance module
     * @param _propertyInfo Initial property information
     * @param baseURI Base URI for token metadata
     */
    function initialize(
        string memory name,
        string memory symbol,
        address admin,
        address minter,
        address _complianceModule,
        PropertyInfo memory _propertyInfo,
        string memory baseURI
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        complianceModule = ComplianceModule(_complianceModule);
        propertyInfo = _propertyInfo;
        _baseTokenURI = baseURI;
    }

    /**
     * @notice Mint a batch of NFTs representing fractional ownership
     * @param to Address to mint tokens to (must be whitelisted)
     * @param count Number of tokens to mint
     * @return tokenIds Array of minted token IDs
     */
    function mintBatch(address to, uint256 count) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        returns (uint256[] memory tokenIds)
    {
        require(to != address(0), "FractionalPropertyNFT: zero address");
        require(count > 0, "FractionalPropertyNFT: invalid count");
        require(
            complianceModule.isWhitelisted(to),
            "FractionalPropertyNFT: recipient not whitelisted"
        );
        require(
            totalTokens + count <= propertyInfo.totalShares,
            "FractionalPropertyNFT: exceeds total shares"
        );

        tokenIds = new uint256[](count);
        // Calculate share percentage in basis points (10000 = 100%)
        // Each token represents (1 / totalShares) of ownership
        uint256 sharePerToken = (10000 * 1e18) / propertyInfo.totalShares; // Basis points with precision

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = totalTokens + i + 1;
            tokenIds[i] = tokenId;
            tokenSharePercentage[tokenId] = sharePerToken;
            
            _safeMint(to, tokenId);
        }

        totalTokens += count;
        emit TokensMinted(to, tokenIds, count);
    }

    /**
     * @notice Update property information
     * @param _propertyInfo New property information
     */
    function updatePropertyInfo(PropertyInfo memory _propertyInfo) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        propertyInfo = _propertyInfo;
        emit PropertyInfoUpdated(
            _propertyInfo.location,
            _propertyInfo.totalValue,
            _propertyInfo.totalShares,
            _propertyInfo.monthlyRental
        );
    }

    /**
     * @notice Set compliance module address
     * @param _complianceModule Address of new compliance module
     */
    function setComplianceModule(address _complianceModule) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(_complianceModule != address(0), "FractionalPropertyNFT: zero address");
        address oldModule = address(complianceModule);
        complianceModule = ComplianceModule(_complianceModule);
        emit ComplianceModuleUpdated(oldModule, _complianceModule);
    }

    /**
     * @notice Set base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    /**
     * @notice Pause all transfers and minting
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause all transfers and minting
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Override transfer to include compliance checks
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        // Skip compliance check for minting (handled in mintBatch)
        if (from != address(0)) {
            require(
                complianceModule.isWhitelisted(to),
                "FractionalPropertyNFT: recipient not whitelisted"
            );
        }
    }

    /**
     * @notice Get token URI for a specific token ID
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Get share percentage for a token (in basis points)
     */
    function getTokenShare(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "FractionalPropertyNFT: token does not exist");
        return tokenSharePercentage[tokenId];
    }

    /**
     * @notice Supports interface check
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /**
     * @notice Internal function to get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
