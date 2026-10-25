# Certify — Decentralized Certificate Verification

Certify is a blockchain-based certificate registry that enables educational institutions and organizations to issue tamper-proof certificates and allows anyone in the world to verify them instantly without needing a crypto wallet or paying gas fees.

---

## How It Works: Cryptographic Hashing & Verification

### 1. Why Hash Instead of Storing Files On-Chain?
- **Privacy**: Certificates often contain personal identifiable information. Storing entire PDFs directly on a public blockchain would expose sensitive recipient details.
- **Cost & Efficiency**: Ethereum storage is expensive. Storing a 2 MB PDF would cost significant gas. Storing a fixed 32-byte SHA-256 hash (`bytes32`) costs pennies and provides identical mathematical security.
- **Tamper Evidence**: Any alteration to a certificate document—even a single byte or pixel—produces an entirely different SHA-256 digest (avalanche effect).

### 2. Client-Side Hashing
When an issuer or verifier selects a certificate file (PDF, image, or document), the browser hashes the file locally using the standard **Web Crypto API** (`crypto.subtle.digest("SHA-256", arrayBuffer)`). The file is never transmitted to a centralized server.

### 3. On-Chain Verification
The smart contract stores a key-value mapping of `bytes32 => Certificate`:
- **Valid**: The hash exists in the contract, and `revoked == false`. The contract returns the issuer address, recipient name, certificate title, and block timestamp.
- **Revoked**: The hash exists, but an authorized issuer called `revokeCertificate(hash)`.
- **Not Found**: The hash has never been registered on-chain.

---

## Project Structure

```text
Certify/
├── contracts/
│   └── CertificateRegistry.sol     # Solidity 0.8.20 smart contract
├── test/
│   └── CertificateRegistry.test.js # Hardhat + Chai unit tests (14 tests)
├── scripts/
│   ├── deploy.js                   # Deploys contract and exports ABI to frontend
│   └── seed.js                     # Generates 2 sample PDFs and issues them on-chain
├── sample-certificates/
│   ├── alice_johnson_blockchain.pdf # Pre-seeded sample certificate
│   └── bob_smith_cryptography.pdf   # Pre-seeded sample certificate
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VerifyPage.jsx      # Wallet-free certificate verification
│   │   │   ├── IssuePage.jsx       # Issuer portal (requires MetaMask)
│   │   │   ├── DashboardPage.jsx   # List of all issued certificates
│   │   │   └── QRCodeModal.jsx     # QR code display and link sharing
│   │   ├── contracts/
│   │   │   └── CertificateRegistry.json # Auto-generated contract ABI & address
│   │   ├── utils/
│   │   │   └── ethereum.js         # Hashing & Ethers v6 provider helpers
│   │   ├── App.jsx                 # Main navigation and wallet connection
│   │   ├── index.css               # Minimal, calm documentation stylesheet
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── .env.example
├── hardhat.config.js
└── package.json
```

---

## Quickstart Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MetaMask](https://metamask.io/) browser extension (required only for issuing/revoking; verifiers do not need MetaMask)

### Step 1: Install Dependencies
Install dependencies for both the smart contract backend and the frontend:
```bash
npm install
npm run frontend:install
```

### Step 2: Run the Unit Tests
Execute the Hardhat test suite to verify contract behavior:
```bash
npm test
```
All 14 unit tests cover certificate issuance, duplicate hash rejection, revocation, read-only verification, and issuer whitelisting.

### Step 3: Start the Local Blockchain Node
Open a terminal and start the local Hardhat Ethereum node:
```bash
npm run node
```
This runs a local JSON-RPC provider on `http://127.0.0.1:8545` with 20 pre-funded test accounts. Keep this terminal open.

### Step 4: Deploy and Seed the Smart Contract
In a second terminal window, deploy the contract to your local node and seed it with two sample certificates:
```bash
npm run deploy
npm run seed
```
This command:
1. Deploys `CertificateRegistry.sol` to the local network.
2. Automatically writes the contract address and ABI into `frontend/src/contracts/CertificateRegistry.json`.
3. Creates valid PDF files in `sample-certificates/` and registers them on-chain.

### Step 5: Start the Frontend
In the second terminal, start the Vite development server:
```bash
npm run frontend:dev
```
Open your browser to `http://localhost:5173`.

---

## Connecting MetaMask (for Issuers)

To issue or revoke certificates, configure MetaMask to connect to your local node:
1. Open MetaMask > Network Selector > **Add a network manually**.
2. Enter the following details:
   - **Network Name**: Hardhat Localhost
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
3. Import the deployer account:
   - From the terminal where `npm run node` is running, copy the Private Key for **Account #0** (`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
   - In MetaMask, click your profile icon > **Add account or hardware wallet** > **Import account** > paste the private key.
4. Refresh the Certify web app and click **Connect Wallet**. The app will recognize you as an authorized `(Issuer)`.

---

## Using the Application

### 1. Verify Page (`/` or `/?tab=verify`)
- **No wallet required**: Anyone can verify certificates freely.
- **Drag & Drop**: Drag a certificate file (e.g., `sample-certificates/alice_johnson_blockchain.pdf`) into the dropzone. The app hashes the file locally and displays the verification result:
  - **Valid**: Shows Recipient, Course Title, Issue Date, Issuer Address, and Document Hash.
  - **Revoked**: Clearly indicates the certificate was revoked by an authorized issuer.
  - **Not Found**: Indicates the document hash is not recorded on-chain.
- **Direct Hash Search**: You can also paste any 64-character SHA-256 hash starting with `0x`.
- **QR Code Verification**: Scanning a certificate's QR code opens this page with `?tab=verify&hash=0x...`, automatically triggering verification.

### 2. Issue Page (`/?tab=issue`)
- Requires connecting an authorized issuer wallet.
- Select any PDF or certificate file. The browser computes the SHA-256 hash and generates a human-friendly Short ID (e.g., `CERT-64F7D20D`).
- Enter the recipient's full name, the certificate/course title, and the issue date.
- Click **Issue Certificate**. MetaMask prompts to sign the transaction.
- Once mined, a confirmation card provides:
  - The Short ID and full transaction hash.
  - An interactive QR code linking directly to the verification page.
  - A button to copy the direct verification link.

### 3. Dashboard Page (`/?tab=dashboard`)
- Displays a searchable public registry of all certificates issued on the smart contract.
- Works without a wallet connected (reads directly from the local node).
- Search/filter certificates by recipient name, course title, or Short ID.
- Actions:
  - **QR**: Opens a modal with the verification QR code and shareable URL.
  - **Verify**: Directly navigates to the Verify tab to test the record.
  - **Revoke**: If connected as an authorized issuer, you can revoke a certificate with one click and confirmation. Revoked certificates update to status `REVOKED` across the entire registry.

---

## Technology Stack

- **Smart Contract**: Solidity `^0.8.20`, compiled and tested using **Hardhat 2** and **Chai**.
- **Frontend**: **React 18** with **Vite 5**.
- **Styling**: Pure CSS with responsive layout and clean typography.
- **Blockchain Interaction**: **ethers.js v6**.
  - Read-only provider (`ethers.JsonRpcProvider`) for wallet-less verification and public dashboard browsing.
  - Signer provider (`ethers.BrowserProvider`) via MetaMask for issuer actions.
- **QR Generation**: SVG QR codes via `qrcode.react`.
- **Cryptography**: Native Web Crypto API (`crypto.subtle.digest("SHA-256")`).
