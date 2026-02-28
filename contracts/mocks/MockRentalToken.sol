// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockRentalToken
 * @notice Mock ERC-20 token for testing yield distribution
 * @dev Simple ERC-20 token that can be minted for testing purposes
 */
contract MockRentalToken is ERC20 {
    address public minter;

    constructor(address _minter) ERC20("Mock Rental Token", "MRT") {
        minter = _minter;
    }

    /**
     * @notice Mint tokens (for testing only)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "MockRentalToken: only minter");
        _mint(to, amount);
    }

    /**
     * @notice Update minter address
     */
    function setMinter(address _minter) external {
        require(msg.sender == minter, "MockRentalToken: only minter");
        minter = _minter;
    }
}
