import React, { useState } from "react";
import {
  computeFileSHA256,
  getSignerContract,
  getShortId,
  truncateAddress,
} from "../utils/ethereum";
import { QRCodeSVG } from "qrcode.react";

export default function IssuePage({ account, isIssuer, onConnectWallet }) {
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("");
  const [dateString, setDateString] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [computedHash, setComputedHash] = useState("");
  const [isHashing, setIsHashing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [issuedCert, setIssuedCert] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrorMessage("");
    setIssuedCert(null);
    setIsHashing(true);

    try {
      const hash = await computeFileSHA256(selectedFile);
      setComputedHash(hash);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not compute hash from file.");
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIssuedCert(null);

    if (!account) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }

    if (!isIssuer) {
      setErrorMessage(
        `Connected account (${truncateAddress(account)}) is not an authorized issuer.`
      );
      return;
    }

    if (!computedHash) {
      setErrorMessage("Please select a certificate file to hash.");
      return;
    }

    if (!recipient.trim()) {
      setErrorMessage("Please enter recipient name.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter certificate/course title.");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = await getSignerContract();

      // Check if hash already registered
      const exists = await contract.certificateExists(computedHash);
      if (exists) {
        setErrorMessage("A certificate with this exact document hash has already been issued.");
        setIsSubmitting(false);
        return;
      }

      // Call issueCertificate(bytes32 hash, string recipient, string title)
      const tx = await contract.issueCertificate(
        computedHash,
        recipient.trim(),
        title.trim()
      );

      const receipt = await tx.wait();

      const shortId = getShortId(computedHash);
      const verifyUrl = `${window.location.origin}/?tab=verify&hash=${computedHash}`;

      setIssuedCert({
        shortId,
        hash: computedHash,
        recipient: recipient.trim(),
        title: title.trim(),
        date: dateString,
        txHash: receipt.hash,
        verifyUrl,
      });

      // Clear form
      setFile(null);
      setRecipient("");
      setTitle("");
      setComputedHash("");
    } catch (err) {
      console.error(err);
      if (err.reason) {
        setErrorMessage(err.reason);
      } else if (err.message && err.message.includes("Certificate hash already registered")) {
        setErrorMessage("A certificate with this document hash is already registered on-chain.");
      } else if (err.code === "ACTION_REJECTED") {
        setErrorMessage("Transaction was cancelled in your wallet.");
      } else {
        setErrorMessage(err.message || "An unexpected error occurred while issuing.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (issuedCert?.verifyUrl) {
      navigator.clipboard.writeText(issuedCert.verifyUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header-bar">
          <span className="card-kicker">AUTHORIZED ISSUANCE CONSOLE</span>
          <h2 className="card-title">Register & Seal New Credential</h2>
          <p className="card-subtitle">
            Record an immutable credential record on the Ethereum ledger. The document remains private; only the cryptographic hash is anchored to the blockchain.
          </p>
        </div>

        {!account ? (
          <div className="notice notice-info">
            <p style={{ marginBottom: "12px", fontWeight: "500" }}>
              An authorized notary or institutional issuer wallet is required to execute issuance transactions.
            </p>
            <button className="btn btn-primary" onClick={onConnectWallet}>
              Connect Issuer Wallet
            </button>
          </div>
        ) : !isIssuer ? (
          <div className="notice notice-warning">
            Your connected wallet (<strong>{truncateAddress(account)}</strong>) is not registered as an authorized issuer on this registry.
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          {/* Certificate File Dropzone */}
          <div className="form-group">
            <label className="form-label" htmlFor="cert-file">
              Official Certificate Document (PDF or high-res image)
            </label>

            <div
              className={`dropzone ${file ? "has-file" : ""}`}
              onClick={() => document.getElementById("cert-file").click()}
            >
              <input
                id="cert-file"
                type="file"
                accept=".pdf,image/*,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              <div className="dropzone-icon-wrap">
                <svg
                  className="dropzone-svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <polyline points="9 15 12 12 15 15"></polyline>
                </svg>
              </div>
              <div className="dropzone-label">
                {isHashing
                  ? "Computing document hash..."
                  : file
                  ? "Change selected document"
                  : "Click or drag certificate document here"}
              </div>
              <div className="dropzone-subtext">
                The document is digested in browser memory. No private files are uploaded over the internet.
              </div>
            </div>
          </div>

          {file && (
            <div className="file-preview-card">
              <div className="file-preview-header">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              {computedHash && (
                <div className="computed-hash-box">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span className="hash-label">SHORT ID:</span>
                    <strong style={{ color: "var(--navy)" }}>{getShortId(computedHash)}</strong>
                  </div>
                  <span className="hash-label">SHA-256 HASH DIGEST:</span>
                  <code className="hash-code">{computedHash}</code>
                </div>
              )}
            </div>
          )}

          {/* Recipient */}
          <div className="form-group">
            <label className="form-label" htmlFor="recipient-input">
              Recipient Full Legal Name
            </label>
            <input
              id="recipient-input"
              type="text"
              className="form-input"
              placeholder="e.g. Eleanor Vance, M.Sc."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          {/* Course / Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title-input">
              Degree, Diploma, or Qualification Title
            </label>
            <input
              id="title-input"
              type="text"
              className="form-input"
              placeholder="e.g. Master of Science in Distributed Ledger Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Issue Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="date-input">
              Official Conferral Date
            </label>
            <input
              id="date-input"
              type="date"
              className="form-input"
              value={dateString}
              onChange={(e) => setDateString(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="notice notice-warning" style={{ marginBottom: "16px" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isHashing || !account || !isIssuer || !computedHash}
            >
              {isSubmitting ? "Signing & Anchoring to Chain..." : "Issue & Seal Certificate"}
            </button>
          </div>
        </form>
      </div>

      {/* Issuance Success Card */}
      {issuedCert && (
        <div className="card cert-result-inner cert-style" style={{ marginTop: "32px" }}>
          <div className="cert-top-banner">
            <div className="seal-group">
              <div className="seal-badge">
                <svg className="seal-svg" width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#b8893b" strokeWidth="1.75" fill="#fdfbf7" />
                  <path d="M7.5 12l3 3 6-6" stroke="#b8893b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="seal-text-wrap">
                <span className="seal-kicker" style={{ color: "var(--gold)" }}>SEALED & ISSUED</span>
                <span className="seal-status-title">Official Credential Registered</span>
              </div>
            </div>

            <div className="cert-qr-mini">
              <QRCodeSVG value={issuedCert.verifyUrl} size={90} level="M" />
            </div>
          </div>

          <div className="cert-recipient-banner">
            <span className="recipient-prefix">Official record created for</span>
            <h3 className="recipient-name-serif">{issuedCert.recipient}</h3>
            <p className="cert-awarded-title">{issuedCert.title}</p>
          </div>

          <div className="cert-divider"></div>

          <dl className="cert-dl-grid">
            <div className="dl-item">
              <dt className="dl-term">Short Credential ID</dt>
              <dd className="dl-def bold-id">{issuedCert.shortId}</dd>
            </div>
            <div className="dl-item">
              <dt className="dl-term">Conferral Date</dt>
              <dd className="dl-def">{issuedCert.date}</dd>
            </div>
            <div className="dl-item dl-full">
              <dt className="dl-term">Transaction Receipt Hash</dt>
              <dd className="dl-def mono">{issuedCert.txHash}</dd>
            </div>
            <div className="dl-item dl-full">
              <dt className="dl-term">SHA-256 Document Fingerprint</dt>
              <dd className="dl-def mono">{issuedCert.hash}</dd>
            </div>
          </dl>

          <div className="btn-group" style={{ marginTop: "20px" }}>
            <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
              {copiedLink ? "Verification Link Copied" : "Copy Verification URL"}
            </button>
            <a
              href={issuedCert.verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold-outline btn-sm"
            >
              Open Verification Portal
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
