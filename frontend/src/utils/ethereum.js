import { ethers } from "ethers";
import contractInfo from "../contracts/CertificateRegistry.json";

// Fallback to local hardhat defaults if not configured in .env
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || contractInfo.address || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || contractInfo.network?.rpcUrl || "http://127.0.0.1:8545";

export const CONTRACT_ABI = contractInfo.abi;

/**
 * Computes the SHA-256 hash of a File or Blob in the browser
 * using the standard Web Crypto API.
 * Returns a 0x-prefixed 64-character hex string (bytes32).
 */
export async function computeFileSHA256(file) {
  const arrayBuffer = await file.arrayBuffer();
  const digestBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(digestBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns a short human-readable identifier from a bytes32 hash.
 * Example: CERT-A1B2C3D4
 */
export function getShortId(hash) {
  if (!hash || hash.length < 10) return "CERT-UNKNOWN";
  return `CERT-${hash.slice(2, 10).toUpperCase()}`;
}

/**
 * Formats a Unix timestamp (seconds) into a readable date string.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown";
  const num = typeof timestamp === "bigint" ? Number(timestamp) : Number(timestamp);
  if (num === 0) return "Unknown";
  return new Date(num * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns a read-only ethers contract instance connected to the local node.
 * No wallet or user authorization required.
 */
export function getReadOnlyContract() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Returns a contract instance connected to the user's browser wallet (MetaMask).
 */
export async function getSignerContract() {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask to perform administrative actions.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Helper to truncate an Ethereum address for display.
 */
export function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
