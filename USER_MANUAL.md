# Certify — User Manual & Operator Guide

Welcome to **Certify**, an official blockchain-based certificate verification portal designed for academic institutions, licensing boards, and notaries. This manual explains how the platform works and provides step-by-step instructions for both public verifiers and authorized certificate issuers.

---

## Table of Contents
1. [Core Principles & Architecture](#core-principles--architecture)
2. [User Roles & Requirements](#user-roles--requirements)
3. [How to Verify a Certificate (Public)](#how-to-verify-a-certificate-public)
4. [How to Issue a Certificate (Authorized Issuers)](#how-to-issue-a-certificate-authorized-issuers)
5. [How to Use the Public Registry Ledger](#how-to-use-the-public-registry-ledger)
6. [Configuring MetaMask (for Issuers)](#configuring-metamask-for-issuers)
7. [Testing with Sample Certificates](#testing-with-sample-certificates)
8. [Troubleshooting & Frequently Asked Questions](#troubleshooting--frequently-asked-questions)

---

## Core Principles & Architecture

Certify anchors trust to the Ethereum blockchain without compromising document privacy or inflating gas costs:

- **Client-Side Cryptographic Hashing**: When a PDF or image is selected, the browser computes its unique 32-byte SHA-256 fingerprint (`0x...`) locally using the Web Crypto API. The document file **never** leaves the computer and is **never** uploaded to any external server.
- **Mathematical Tamper-Evidence**: If even one character, pixel, or byte of the certificate is altered after issuance, its computed SHA-256 hash changes completely. The modified document will immediately fail verification.
- **Zero-Cost Public Verification**: Verifying a certificate queries the smart contract via a read-only JSON-RPC provider. Public verifiers **do not need a crypto wallet, MetaMask, or any cryptocurrency**.

---

## User Roles & Requirements

| Role | Permissions | Requirements |
| :--- | :--- | :--- |
| **Verifier (Anyone)** | Verify certificates, scan QR codes, browse the public registry ledger. | Modern web browser only (Chrome, Firefox, Safari, Edge). **No wallet needed.** |
| **Issuer (Admin / Registrar)** | Issue new certificates on-chain, revoke compromised or superseded certificates. | Web browser + [MetaMask](https://metamask.io/) extension connected with an authorized issuer wallet address. |

---

## How to Verify a Certificate (Public)

Anyone (employers, graduate admissions, government bodies) can authenticate a credential in seconds.

### Method 1: Uploading the Original Certificate File (Recommended)
1. Navigate to the **Verify Credential** page: [http://localhost:5173/?tab=verify](http://localhost:5173/?tab=verify).
2. Drag and drop the original PDF or image certificate file into the dashed gold box, or click anywhere inside the box to browse your files.
3. The browser automatically computes the document's SHA-256 hash and immediately queries the blockchain contract.
4. Review the verification result displayed below the box.

### Method 2: Entering the Document Hash Directly
1. On the **Verify Credential** page, locate the section titled *"OR VERIFY BY HASH DIRECTLY"*.
2. Paste the 64-character hexadecimal SHA-256 hash starting with `0x` into the input field.
3. Click the **Verify Credential** button.

### Method 3: Scanning a Certificate QR Code
1. Scan the QR code printed on the physical certificate or digital PDF using a smartphone camera or barcode scanner.
2. The QR code opens the direct verification URL: `http://localhost:5173/?tab=verify&hash=0x...`.
3. The certificate is automatically verified on page load.

---

### Understanding the Verification Results

#### 1. Valid (Authentic Certificate)
- **Visual**: Double gold border, green authentic seal, recipient name in large serif typography.
- **Meaning**: The certificate was authentically issued by a whitelisted authority and has not been revoked or altered.
- **Displayed Details**:
  - **Recipient Name**: Legal recipient recorded on-chain.
  - **Award Title**: Degree, qualification, or certificate title.
  - **Short ID**: Human-readable badge (e.g., `CERT-64F7D20D`).
  - **Date of Record**: Timestamp when the transaction was mined on-chain.
  - **Issuer Address**: Ethereum address of the issuing authority.
  - **Document Digest**: Exact 32-byte SHA-256 hash.

#### 2. Revoked (Invalidated Credential)
- **Visual**: Red border, official red `REVOKED` stamp.
- **Meaning**: The document was originally issued on-chain, but was subsequently invalidated by an authorized issuer (e.g., degree rescinded, renewal expired, or issued in error).

#### 3. Credential Not Found
- **Visual**: Neutral gray card with alert icon.
- **Meaning**: No record of this document fingerprint exists in the blockchain registry. Either the document has been altered (even slightly), or it was never registered by an authorized issuer.

---

## How to Issue a Certificate (Authorized Issuers)

> [!IMPORTANT]
> Issuing a certificate requires connecting MetaMask with an authorized issuer wallet (by default, Account #0 from the local Hardhat node).

1. Navigate to the **Issue Certificate** page: [http://localhost:5173/?tab=issue](http://localhost:5173/?tab=issue).
2. If your wallet is not connected, click the **Connect Wallet** button in the header or on the page.
3. In the form:
   - **Document File**: Click or drag the PDF/image certificate into the dropzone. The browser displays the computed Short ID and SHA-256 hash in a monospace box.
   - **Recipient Full Legal Name**: Enter the recipient's full name (e.g., `Eleanor Vance, M.Sc.`).
   - **Award / Qualification Title**: Enter the degree or course title (e.g., `Certified Blockchain Developer`).
   - **Official Conferral Date**: Select the conferral date (defaults to today).
4. Click **Issue & Seal Certificate**.
5. MetaMask will open asking to confirm the transaction. Click **Confirm**.
6. Once the transaction is mined (1–2 seconds):
   - A gold-bordered **Sealed & Issued** card appears.
   - It displays the assigned **Short ID**, **Transaction Hash**, and an interactive **QR Seal**.
   - Click **Copy Verification URL** to copy the public verification link, or download/print the QR code to include on the issued certificate document.

> [!NOTE]
> The smart contract will reject duplicate certificates. If a file with the exact same SHA-256 hash has already been registered, the app will inform you immediately without charging gas.

---

## How to Use the Public Registry Ledger

The **Registry Ledger** (Dashboard) is an open catalog of all certificates registered on the smart contract:

1. Navigate to the **Registry Ledger** tab: [http://localhost:5173/?tab=dashboard](http://localhost:5173/?tab=dashboard).
2. **Search / Filter**: Type in the search box to filter records in real-time by recipient name, qualification title, or Short ID.
3. **Actions on Each Record**:
   - **QR**: Opens an official modal with the certificate's QR seal, Short ID, full hash, and link copy tool.
   - **Verify**: Jumps directly to the Verify page with this certificate preloaded.
   - **Revoke**: Only available if you are connected with an authorized issuer wallet. Clicking **Revoke** prompts for confirmation, then triggers a MetaMask transaction to permanently mark the certificate as revoked on the blockchain.

---

## Configuring MetaMask (for Issuers)

To issue or revoke certificates locally:

1. Open your MetaMask browser extension.
2. Click the network selector in the top-left corner > **Add network** > **Add a network manually**.
3. Fill in the network parameters:
   - **Network Name**: `Hardhat Localhost`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Click **Save** and switch to this network.
5. Import the pre-funded Deployer/Issuer account:
   - In MetaMask, click the Account menu (top circular icon) > **Add account or hardware wallet** > **Import account**.
   - Paste the Private Key for Hardhat Account #0:
     ```text
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - Click **Import**. You will now see 10,000 ETH of test balance.
6. Refresh [http://localhost:5173/](http://localhost:5173/) and click **Connect Wallet**. The header will display your address with the `• Issuer` badge.

---

## Testing with Sample Certificates

The project includes two pre-seeded, valid PDF certificates in the `sample-certificates/` directory for immediate testing:

| File | Recipient | Title | Short ID | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| `sample-certificates/alice_johnson_blockchain.pdf` | Alice Johnson | Certified Blockchain Developer | `CERT-64F7D20D` | **Valid** |
| `sample-certificates/bob_smith_cryptography.pdf` | Bob Smith | Applied Cryptography and Security | `CERT-0A111139` | **Valid** |

### Test Exercise
1. Go to [http://localhost:5173/?tab=verify](http://localhost:5173/?tab=verify).
2. Drag and drop `sample-certificates/alice_johnson_blockchain.pdf` into the upload zone.
3. Observe the immediate **Authentic Certificate** result with green seal and Alice Johnson's credential details.
4. Try modifying `alice_johnson_blockchain.pdf` in a text or PDF editor and re-uploading: the hash changes, and the portal will report **Credential Not Found**.

---

## Troubleshooting & Frequently Asked Questions

### Q1: Why does verification report "Could not connect to the blockchain provider"?
**Answer**: Make sure your local Hardhat node is running in a terminal.
Run:
```bash
npm run node
```
The node must be accessible at `http://127.0.0.1:8545`.

### Q2: Why does the Issue button say "Connected account is not an authorized issuer"?
**Answer**: Only accounts whitelisted on the smart contract can issue certificates. The deployer account (Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) is the primary authorized issuer. Ensure you have imported and selected Account #0 in MetaMask.

### Q3: Why does MetaMask show "Transaction failed: Certificate hash already registered"?
**Answer**: The smart contract enforces that every certificate hash is unique. If you upload a file that has already been issued, the transaction is rejected to prevent duplicate or conflicting records.

### Q4: Does Certify store student PDFs on the blockchain?
**Answer**: **No.** Storing large files on a blockchain is prohibitively expensive and violates recipient privacy. Certify computes a 32-byte cryptographic SHA-256 fingerprint in browser memory and records only that fingerprint alongside the recipient's name, title, and timestamp. The actual PDF remains in the possession of the student and issuing institution.
