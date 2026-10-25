const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  let CertificateRegistry;
  let registry;
  let owner;
  let issuer2;
  let unauthorized;
  let recipientName = "Alice Johnson";
  let courseTitle = "Certified Blockchain Developer";
  // A sample SHA-256 hash (bytes32 format)
  let sampleHash1 = ethers.keccak256(ethers.toUtf8Bytes("Certificate Content 1"));
  let sampleHash2 = ethers.keccak256(ethers.toUtf8Bytes("Certificate Content 2"));

  beforeEach(async function () {
    [owner, issuer2, unauthorized] = await ethers.getSigners();
    CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set deployer as owner and authorized issuer", async function () {
      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.isIssuer(owner.address)).to.be.true;
      expect(await registry.isIssuer(unauthorized.address)).to.be.false;
      expect(await registry.getCertificateCount()).to.equal(0);
    });
  });

  describe("Issuing Certificates", function () {
    it("should allow an authorized issuer to issue a certificate", async function () {
      const tx = await registry.issueCertificate(sampleHash1, recipientName, courseTitle);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "CertificateIssued")
        .withArgs(sampleHash1, owner.address, recipientName, courseTitle, block.timestamp);

      expect(await registry.getCertificateCount()).to.equal(1);
      const hashes = await registry.getCertificateHashes();
      expect(hashes.length).to.equal(1);
      expect(hashes[0]).to.equal(sampleHash1);
    });

    it("should reject duplicate certificate hashes", async function () {
      await registry.issueCertificate(sampleHash1, recipientName, courseTitle);

      await expect(
        registry.issueCertificate(sampleHash1, "Another Recipient", "Another Title")
      ).to.be.revertedWith("Certificate hash already registered");
    });

    it("should reject invalid arguments (empty string, zero hash)", async function () {
      await expect(
        registry.issueCertificate(ethers.ZeroHash, recipientName, courseTitle)
      ).to.be.revertedWith("Invalid certificate hash");

      await expect(
        registry.issueCertificate(sampleHash1, "", courseTitle)
      ).to.be.revertedWith("Recipient cannot be empty");

      await expect(
        registry.issueCertificate(sampleHash1, recipientName, "")
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("should reject unauthorized callers from issuing", async function () {
      await expect(
        registry.connect(unauthorized).issueCertificate(sampleHash1, recipientName, courseTitle)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });
  });

  describe("Verifying Certificates", function () {
    it("should verify an existing certificate accurately", async function () {
      await registry.issueCertificate(sampleHash1, recipientName, courseTitle);

      const [issuer, recipient, title, timestamp, revoked] =
        await registry.verifyCertificate(sampleHash1);

      expect(issuer).to.equal(owner.address);
      expect(recipient).to.equal(recipientName);
      expect(title).to.equal(courseTitle);
      expect(timestamp).to.be.gt(0);
      expect(revoked).to.be.false;
      expect(await registry.certificateExists(sampleHash1)).to.be.true;
    });

    it("should return zero values for non-existent certificate", async function () {
      const [issuer, recipient, title, timestamp, revoked] =
        await registry.verifyCertificate(sampleHash2);

      expect(issuer).to.equal(ethers.ZeroAddress);
      expect(recipient).to.equal("");
      expect(title).to.equal("");
      expect(timestamp).to.equal(0n);
      expect(revoked).to.be.false;
      expect(await registry.certificateExists(sampleHash2)).to.be.false;
    });
  });

  describe("Revoking Certificates", function () {
    beforeEach(async function () {
      await registry.issueCertificate(sampleHash1, recipientName, courseTitle);
    });

    it("should allow an issuer to revoke a certificate", async function () {
      const tx = await registry.revokeCertificate(sampleHash1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, "CertificateRevoked")
        .withArgs(sampleHash1, owner.address, block.timestamp);

      const [issuer, recipient, title, timestamp, revoked] =
        await registry.verifyCertificate(sampleHash1);

      expect(issuer).to.equal(owner.address);
      expect(recipient).to.equal(recipientName);
      expect(revoked).to.be.true;
    });

    it("should reject revoking an already revoked certificate", async function () {
      await registry.revokeCertificate(sampleHash1);

      await expect(registry.revokeCertificate(sampleHash1)).to.be.revertedWith(
        "Certificate is already revoked"
      );
    });

    it("should reject revoking a non-existent certificate", async function () {
      await expect(registry.revokeCertificate(sampleHash2)).to.be.revertedWith(
        "Certificate not found"
      );
    });

    it("should reject unauthorized callers from revoking", async function () {
      await expect(
        registry.connect(unauthorized).revokeCertificate(sampleHash1)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });
  });

  describe("Issuer Whitelisting & Access Control", function () {
    it("should allow owner to add a new issuer", async function () {
      await expect(registry.addIssuer(issuer2.address))
        .to.emit(registry, "IssuerAdded")
        .withArgs(issuer2.address);

      expect(await registry.isIssuer(issuer2.address)).to.be.true;

      // Newly added issuer can issue certificates
      await registry.connect(issuer2).issueCertificate(sampleHash1, recipientName, courseTitle);
      const [issuer] = await registry.verifyCertificate(sampleHash1);
      expect(issuer).to.equal(issuer2.address);
    });

    it("should allow owner to remove an issuer", async function () {
      await registry.addIssuer(issuer2.address);
      await expect(registry.removeIssuer(issuer2.address))
        .to.emit(registry, "IssuerRemoved")
        .withArgs(issuer2.address);

      expect(await registry.isIssuer(issuer2.address)).to.be.false;

      await expect(
        registry.connect(issuer2).issueCertificate(sampleHash1, recipientName, courseTitle)
      ).to.be.revertedWith("Caller is not an authorized issuer");
    });

    it("should prevent non-owners from managing issuers", async function () {
      await expect(
        registry.connect(unauthorized).addIssuer(unauthorized.address)
      ).to.be.revertedWith("Only contract owner can perform this action");

      await expect(
        registry.connect(unauthorized).removeIssuer(owner.address)
      ).to.be.revertedWith("Only contract owner can perform this action");
    });
  });
});
