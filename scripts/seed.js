const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Creates a valid PDF certificate file with plain text layout.
 */
function createCertificatePdf(recipient, title, date) {
  const streamBody = [
    "q",
    "0 0 0 rg",
    "BT",
    "/F1 20 Tf",
    "50 720 Td",
    "(CERTIFY - VERIFIABLE CERTIFICATE) Tj",
    "ET",
    "BT",
    "/F1 12 Tf",
    "50 670 Td",
    "(This is to certify that) Tj",
    "ET",
    "BT",
    "/F1 16 Tf",
    "50 635 Td",
    `(${recipient}) Tj`,
    "ET",
    "BT",
    "/F1 12 Tf",
    "50 595 Td",
    "(has successfully fulfilled the requirements for:) Tj",
    "ET",
    "BT",
    "/F1 14 Tf",
    "50 560 Td",
    `(${title}) Tj`,
    "ET",
    "BT",
    "/F1 11 Tf",
    "50 510 Td",
    `(${date}) Tj`,
    "ET",
    "Q",
  ].join("\n");

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${Buffer.byteLength(streamBody)} >>
stream
${streamBody}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000225 00000 n 
0000000296 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + Buffer.byteLength(streamBody)}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function main() {
  console.log("Seeding sample certificates...");

  const [signer] = await ethers.getSigners();
  console.log("Using issuer account:", signer.address);

  // Look for deployed contract address
  const contractInfoPath = path.join(
    __dirname,
    "../frontend/src/contracts/CertificateRegistry.json"
  );

  let registryAddress;
  if (fs.existsSync(contractInfoPath)) {
    const data = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"));
    registryAddress = data.address;
  }

  let registry;
  if (registryAddress) {
    console.log("Found existing deployment at:", registryAddress);
    registry = await ethers.getContractAt("CertificateRegistry", registryAddress);
  } else {
    console.log("No deployment found. Deploying fresh contract...");
    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
    registryAddress = await registry.getAddress();
    console.log("Deployed new contract to:", registryAddress);
  }

  // Ensure sample certificates directory exists
  const samplesDir = path.join(__dirname, "../sample-certificates");
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  const sampleCerts = [
    {
      filename: "alice_johnson_blockchain.pdf",
      recipient: "Alice Johnson",
      title: "Certified Blockchain Developer",
      date: "October 15, 2024",
    },
    {
      filename: "bob_smith_cryptography.pdf",
      recipient: "Bob Smith",
      title: "Applied Cryptography and Security",
      date: "November 02, 2024",
    },
  ];

  for (const cert of sampleCerts) {
    const filePath = path.join(samplesDir, cert.filename);
    const pdfBuffer = createCertificatePdf(cert.recipient, cert.title, cert.date);
    fs.writeFileSync(filePath, pdfBuffer);

    // Compute SHA-256 hash (same method as browser crypto.subtle)
    const hash = "0x" + crypto.createHash("sha256").update(pdfBuffer).digest("hex");
    const shortId = hash.slice(2, 10).toUpperCase();

    const exists = await registry.certificateExists(hash);
    if (exists) {
      console.log(`Certificate already exists on-chain for ${cert.recipient} (${shortId})`);
    } else {
      console.log(`Issuing certificate on-chain for ${cert.recipient}...`);
      const tx = await registry.issueCertificate(hash, cert.recipient, cert.title);
      await tx.wait();
      console.log(`Successfully issued!`);
    }

    console.log({
      recipient: cert.recipient,
      title: cert.title,
      shortId: `CERT-${shortId}`,
      hash: hash,
      sampleFile: filePath,
    });
  }

  console.log("\nSeed completed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
