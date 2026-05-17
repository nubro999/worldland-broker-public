import hre from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");

  // 메인넷 USDT 주소 (BSC Mainnet)
  const USDT_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;

  console.log("\n📦 Deploying GPUVault...");
  console.log("Payment Token (USDT):", USDT_ADDRESS);
  console.log("Fee Recipient:", FEE_RECIPIENT);

  const GPUVault = await hre.ethers.getContractFactory("GPUVault");
  const gpuVault = await GPUVault.deploy(USDT_ADDRESS, FEE_RECIPIENT);
  await gpuVault.waitForDeployment();
  const gpuVaultAddress = await gpuVault.getAddress();

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Mainnet Deployment Complete!");
  console.log("=".repeat(50));
  console.log("Network: BSC Mainnet");
  console.log("GPUVault:", gpuVaultAddress);
  console.log("Payment Token:", USDT_ADDRESS);
  console.log("Fee Recipient:", FEE_RECIPIENT);
  console.log("Platform Fee: 5%");
  console.log("=".repeat(50));

  // 컨트랙트 검증
  console.log("\n📝 Verify command:");
  console.log(`npx hardhat verify --network bsc ${gpuVaultAddress} "${USDT_ADDRESS}" "${FEE_RECIPIENT}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
