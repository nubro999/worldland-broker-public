import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");

  // 1. MockUSDT 배포 (테스트넷용)
  console.log("\n📦 Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log("✅ MockUSDT deployed to:", mockUSDTAddress);

  // 2. GPUVault 배포
  console.log("\n📦 Deploying GPUVault...");
  const GPUVault = await hre.ethers.getContractFactory("GPUVault");
  const gpuVault = await GPUVault.deploy(
    mockUSDTAddress,   // Payment Token
    deployer.address   // Fee Recipient
  );
  await gpuVault.waitForDeployment();
  const gpuVaultAddress = await gpuVault.getAddress();
  console.log("✅ GPUVault deployed to:", gpuVaultAddress);

  // 3. 배포 정보 출력
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(50));
  console.log("Network:", hre.network.name);
  console.log("MockUSDT:", mockUSDTAddress);
  console.log("GPUVault:", gpuVaultAddress);
  console.log("Fee Recipient:", deployer.address);
  console.log("=".repeat(50));

  // 4. 컨트랙트 검증 명령어 출력
  console.log("\n📝 Verify commands:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${mockUSDTAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${gpuVaultAddress} "${mockUSDTAddress}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
