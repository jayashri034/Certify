const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting CertificateRegistry deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("CertificateRegistry deployed successfully to:", contractAddress);

  // Read ABI from hardhat artifacts
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Ensure frontend contracts directory exists
  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  // Export contract deployment info for frontend
  const contractData = {
    address: contractAddress,
    abi: artifact.abi,
    network: {
      name: "localhost",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
    },
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const outputPath = path.join(frontendContractsDir, "CertificateRegistry.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
  console.log("Exported contract configuration to:", outputPath);

  // Write frontend/.env file
  const frontendEnvPath = path.join(__dirname, "../frontend/.env");
  const envContent = `VITE_CONTRACT_ADDRESS=${contractAddress}\nVITE_RPC_URL=http://127.0.0.1:8545\n`;
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log("Updated frontend/.env with contract address:", contractAddress);

  return contractAddress;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
