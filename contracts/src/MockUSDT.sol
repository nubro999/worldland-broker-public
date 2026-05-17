// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @notice 테스트용 USDT 토큰 (BSC Testnet 배포용)
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals = 18;

    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        // 초기 발행: 1,000,000 USDT
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice 테스트용 토큰 발행 (faucet)
     * @param to 받을 주소
     * @param amount 발행량
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice 누구나 테스트 토큰 받기 (최대 10,000 USDT)
     */
    function faucet() external {
        _mint(msg.sender, 10_000 * 10 ** decimals());
    }
}
