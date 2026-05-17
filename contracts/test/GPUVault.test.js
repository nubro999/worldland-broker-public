import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("GPUVault", function () {
  let gpuVault;
  let mockUSDT;
  let owner, user, provider, sessionKey;
  
  const INITIAL_BALANCE = ethers.parseEther("10000"); // 10,000 USDT
  const DEPOSIT_AMOUNT = ethers.parseEther("1000");   // 1,000 USDT
  const PRICE_PER_SECOND = ethers.parseEther("0.001"); // 0.001 USDT/초

  beforeEach(async function () {
    [owner, user, provider, sessionKey] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();

    // Deploy GPUVault
    const GPUVault = await ethers.getContractFactory("GPUVault");
    gpuVault = await GPUVault.deploy(await mockUSDT.getAddress(), owner.address);

    // Transfer USDT to user
    await mockUSDT.transfer(user.address, INITIAL_BALANCE);
    
    // Approve GPUVault to spend user's USDT
    await mockUSDT.connect(user).approve(await gpuVault.getAddress(), INITIAL_BALANCE);
  });

  describe("Deposit & Withdraw", function () {
    it("Should deposit tokens", async function () {
      await gpuVault.connect(user).deposit(DEPOSIT_AMOUNT);
      
      expect(await gpuVault.deposits(user.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should withdraw tokens", async function () {
      await gpuVault.connect(user).deposit(DEPOSIT_AMOUNT);
      
      const withdrawAmount = ethers.parseEther("500");
      await gpuVault.connect(user).withdraw(withdrawAmount);
      
      expect(await gpuVault.deposits(user.address)).to.equal(DEPOSIT_AMOUNT - withdrawAmount);
    });

    it("Should fail to withdraw more than deposited", async function () {
      await gpuVault.connect(user).deposit(DEPOSIT_AMOUNT);
      
      await expect(
        gpuVault.connect(user).withdraw(DEPOSIT_AMOUNT + 1n)
      ).to.be.revertedWithCustomError(gpuVault, "InsufficientDeposit");
    });
  });

  describe("Session Key", function () {
    const SPEND_LIMIT = ethers.parseEther("100");
    const DURATION = 24 * 60 * 60; // 1 day

    it("Should register session key", async function () {
      await gpuVault.connect(user).registerSessionKey(
        sessionKey.address,
        SPEND_LIMIT,
        DURATION
      );

      const sk = await gpuVault.getSessionKey(sessionKey.address);
      expect(sk.mainWallet).to.equal(user.address);
      expect(sk.spendLimit).to.equal(SPEND_LIMIT);
      expect(sk.isActive).to.be.true;
    });

    it("Should revoke session key", async function () {
      await gpuVault.connect(user).registerSessionKey(
        sessionKey.address,
        SPEND_LIMIT,
        DURATION
      );

      await gpuVault.connect(user).revokeSessionKey(sessionKey.address);

      const sk = await gpuVault.getSessionKey(sessionKey.address);
      expect(sk.isActive).to.be.false;
    });

    it("Should fail to revoke by non-owner", async function () {
      await gpuVault.connect(user).registerSessionKey(
        sessionKey.address,
        SPEND_LIMIT,
        DURATION
      );

      await expect(
        gpuVault.connect(provider).revokeSessionKey(sessionKey.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Rental", function () {
    beforeEach(async function () {
      await gpuVault.connect(user).deposit(DEPOSIT_AMOUNT);
    });

    it("Should start rental", async function () {
      const tx = await gpuVault.connect(user).startRental(
        provider.address,
        PRICE_PER_SECOND,
        "job-123"
      );

      await expect(tx)
        .to.emit(gpuVault, "RentalStarted")
        .withArgs(0, user.address, provider.address, "job-123", PRICE_PER_SECOND);
    });

    it("Should end rental and pay provider", async function () {
      await gpuVault.connect(user).startRental(
        provider.address,
        PRICE_PER_SECOND,
        "job-123"
      );

      // Simulate 100 seconds of usage
      await time.increase(100);

      const providerBalanceBefore = await mockUSDT.balanceOf(provider.address);
      
      await gpuVault.connect(user).endRental(0);

      const providerBalanceAfter = await mockUSDT.balanceOf(provider.address);

      // Provider should receive payment minus fee
      expect(providerBalanceAfter).to.be.greaterThan(providerBalanceBefore);
    });

    it("Should start rental with session key", async function () {
      // Register session key
      await gpuVault.connect(user).registerSessionKey(
        sessionKey.address,
        ethers.parseEther("100"),
        24 * 60 * 60
      );

      // Start rental using session key (called by backend/relayer)
      await gpuVault.startRentalWithSessionKey(
        sessionKey.address,
        provider.address,
        PRICE_PER_SECOND,
        "job-456"
      );

      const rental = await gpuVault.getRental(0);
      expect(rental.renter).to.equal(user.address);
      expect(rental.provider).to.equal(provider.address);
    });
  });

  describe("Platform Fee", function () {
    it("Should set platform fee", async function () {
      await gpuVault.setPlatformFee(300); // 3%
      expect(await gpuVault.platformFeeBps()).to.equal(300);
    });

    it("Should fail to set fee too high", async function () {
      await expect(
        gpuVault.setPlatformFee(1500) // 15% - too high
      ).to.be.revertedWith("Fee too high");
    });
  });
});
