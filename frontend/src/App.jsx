import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import VerifyPage from "./components/VerifyPage";
import IssuePage from "./components/IssuePage";
import DashboardPage from "./components/DashboardPage";
import {
  CONTRACT_ADDRESS,
  getReadOnlyContract,
  truncateAddress,
} from "./utils/ethereum";

export default function App() {
  const [activeTab, setActiveTab] = useState("verify");
  const [targetHash, setTargetHash] = useState("");
  const [account, setAccount] = useState("");
  const [isIssuer, setIsIssuer] = useState(false);
  const [walletError, setWalletError] = useState("");

  // Parse query params on initial load (e.g. ?tab=verify&hash=0x...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const hashParam = params.get("hash");

    if (tabParam && ["verify", "issue", "dashboard"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (hashParam) {
      setTargetHash(hashParam);
    }
  }, []);

  // Update URL without reload when tab changes
  const switchTab = (tab, hash = "") => {
    setActiveTab(tab);
    setTargetHash(hash);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (hash) {
      url.searchParams.set("hash", hash);
    } else {
      url.searchParams.delete("hash");
    }
    window.history.pushState({}, "", url.toString());
  };

  // Check issuer status for an address
  const checkIssuerStatus = async (userAddress) => {
    if (!userAddress) {
      setIsIssuer(false);
      return;
    }
    try {
      const contract = getReadOnlyContract();
      const status = await contract.isIssuer(userAddress);
      setIsIssuer(Boolean(status));
    } catch (err) {
      console.warn("Could not check issuer status:", err);
      setIsIssuer(false);
    }
  };

  // Connect MetaMask
  const connectWallet = async () => {
    setWalletError("");
    if (!window.ethereum) {
      setWalletError("MetaMask was not detected. Please install the browser extension.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        await checkIssuerStatus(accounts[0]);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setWalletError("Connection rejected in MetaMask.");
      } else {
        setWalletError("Failed to connect wallet.");
      }
    }
  };

  // Listen to MetaMask account / network changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            checkIssuerStatus(accounts[0]);
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          checkIssuerStatus(accounts[0]);
        } else {
          setAccount("");
          setIsIssuer(false);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  return (
    <div className="site-wrapper">
      {/* Full-width Navy Header Band */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-logo">
              <span className="brand-title">Certify</span>
              <span className="brand-badge">Official Portal</span>
            </div>
            <span className="brand-desc">Academic & Notary Credential Verification</span>
          </div>

          <div className="header-controls">
            <nav className="nav-tabs" aria-label="Main Navigation">
              <button
                className={`nav-tab ${activeTab === "verify" ? "active" : ""}`}
                onClick={() => switchTab("verify")}
              >
                Verify Credential
              </button>
              <button
                className={`nav-tab ${activeTab === "issue" ? "active" : ""}`}
                onClick={() => switchTab("issue")}
              >
                Issue Certificate
              </button>
              <button
                className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => switchTab("dashboard")}
              >
                Registry Ledger
              </button>
            </nav>

            <div className="header-wallet">
              {account ? (
                <div className="wallet-badge connected" title={account}>
                  <span className="wallet-dot"></span>
                  {truncateAddress(account)} {isIssuer ? "• Issuer" : "• Connected"}
                </div>
              ) : (
                <button className="btn btn-gold-outline btn-sm" onClick={connectWallet}>
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {walletError && (
        <div className="banner-alert">
          <div className="banner-alert-inner">
            <span>{walletError}</span>
            <button className="banner-close" onClick={() => setWalletError("")}>&times;</button>
          </div>
        </div>
      )}

      {/* Slim Intro Band Under Header */}
      <section className="intro-band">
        <div className="intro-inner">
          {activeTab === "verify" && (
            <>
              <h1 className="intro-title">Credential Verification</h1>
              <p className="intro-tagline">
                Authenticate tamper-evident degrees, diplomas, and official documents via cryptographic on-chain consensus.
              </p>
            </>
          )}
          {activeTab === "issue" && (
            <>
              <h1 className="intro-title">Issue Official Certificate</h1>
              <p className="intro-tagline">
                Cryptographically seal credentials and permanently register document fingerprints to the immutable ledger.
              </p>
            </>
          )}
          {activeTab === "dashboard" && (
            <>
              <h1 className="intro-title">Public Registry Ledger</h1>
              <p className="intro-tagline">
                Transparent and decentralized catalog of all authorized academic and notarized credentials.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="app-container">
        {activeTab === "verify" && (
          <VerifyPage initialHash={targetHash} />
        )}

        {activeTab === "issue" && (
          <IssuePage
            account={account}
            isIssuer={isIssuer}
            onConnectWallet={connectWallet}
          />
        )}

        {activeTab === "dashboard" && (
          <DashboardPage
            account={account}
            isIssuer={isIssuer}
            onConnectWallet={connectWallet}
            onNavigateVerify={(hash) => switchTab("verify", hash)}
          />
        )}
      </main>

      {/* Full-width Navy Footer with Gold Accent */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-meta">
            <span className="footer-label">Smart Contract Registry:</span>{" "}
            <code className="contract-address">{CONTRACT_ADDRESS}</code>
          </div>
          <div className="footer-seal">
            <span>Certify Verification Authority • Chain ID 31337</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
