import React, { useState, useEffect } from "react";
import {
  computeFileSHA256,
  getReadOnlyContract,
  getShortId,
  formatTimestamp,
} from "../utils/ethereum";
import QRCodeModal from "./QRCodeModal";

export default function VerifyPage({ initialHash }) {
  const [file, setFile] = useState(null);
  const [manualHash, setManualHash] = useState(initialHash || "");
  const [computedHash, setComputedHash] = useState(initialHash || "");
  const [isHashing, setIsHashing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCertForQr, setSelectedCertForQr] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // If initialHash is passed (e.g. from QR code or URL param), verify automatically
  useEffect(() => {
    if (initialHash && /^0x[0-9a-fA-F]{64}$/.test(initialHash)) {
      setManualHash(initialHash);
      setComputedHash(initialHash);
      verifyByHash(initialHash);
    }
  }, [initialHash]);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrorMessage("");
    setResult(null);
    setIsHashing(true);

    try {
      const hash = await computeFileSHA256(selectedFile);
      setComputedHash(hash);
      setManualHash(hash);
      await verifyByHash(hash);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to compute SHA-256 hash for the selected file.");
    } finally {
      setIsHashing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const verifyByHash = async (hashToVerify) => {
    const cleanHash = (hashToVerify || "").trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
      setErrorMessage("Please enter a valid 64-character hex hash starting with 0x.");
      return;
    }

    setErrorMessage("");
    setIsVerifying(true);
    setResult(null);

    try {
      const contract = getReadOnlyContract();
      const [issuer, recipient, title, timestamp, revoked] =
        await contract.verifyCertificate(cleanHash);

      // Contract returns zero address if certificate does not exist
      if (issuer === "0x0000000000000000000000000000000000000000") {
        setResult({
          status: "not-found",
          hash: cleanHash,
        });
      } else if (revoked) {
        setResult({
          status: "revoked",
          issuer,
          recipient,
          title,
          timestamp,
          revoked,
          hash: cleanHash,
          shortId: getShortId(cleanHash),
        });
      } else {
        setResult({
          status: "valid",
          issuer,
          recipient,
          title,
          timestamp,
          revoked,
          hash: cleanHash,
          shortId: getShortId(cleanHash),
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Could not connect to the blockchain provider. Please ensure the local node is running on http://127.0.0.1:8545."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    verifyByHash(manualHash);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header-bar">
          <span className="card-kicker">INSTANT DOCUMENT VERIFICATION</span>
          <h2 className="card-title">Upload Certificate for Authentication</h2>
          <p className="card-subtitle">
            Upload an original PDF document to calculate its cryptographic SHA-256 fingerprint locally in your browser, or submit an existing hash.
          </p>
        </div>

        {/* Larger, inviting Dropzone with inline SVG icon */}
        <div
          className={`dropzone ${dragActive ? "drag-active" : ""} ${file ? "has-file" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("verify-file-input").click()}
        >
          <input
            id="verify-file-input"
            type="file"
            accept=".pdf,image/*,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e.target.files[0])}
          />

          <div className="dropzone-icon-wrap">
            <svg
              className="dropzone-svg"
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <polyline points="9 15 12 12 15 15"></polyline>
            </svg>
          </div>

          <div className="dropzone-label">
            {isHashing
              ? "Computing cryptographic digest..."
              : file
              ? "Change document file"
              : "Drag & drop certificate document, or click to browse"}
          </div>
          <div className="dropzone-subtext">
            Supports official PDF transcripts, diplomas, and notarized credentials. Processed client-side.
          </div>
        </div>

        {/* File and Computed Hash in Monospace Box */}
        {file && (
          <div className="file-preview-card">
            <div className="file-preview-header">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            {computedHash && (
              <div className="computed-hash-box">
                <span className="hash-label">DOCUMENT SHA-256 DIGEST:</span>
                <code className="hash-code">{computedHash}</code>
              </div>
            )}
          </div>
        )}

        <div className="manual-verify-divider">
          <span>OR VERIFY BY HASH DIRECTLY</span>
        </div>

        {/* Manual Hash Form */}
        <form onSubmit={handleManualSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="hash-input">
              Certificate SHA-256 Hash (bytes32 format)
            </label>
            <div className="input-with-button">
              <input
                id="hash-input"
                type="text"
                className="form-input font-mono"
                placeholder="0x..."
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isVerifying || isHashing || !manualHash}
              >
                {isVerifying ? "Querying..." : "Verify Credential"}
              </button>
            </div>
          </div>
        </form>

        {errorMessage && (
          <div className="notice notice-warning" style={{ marginTop: "16px" }}>
            {errorMessage}
          </div>
        )}
      </div>

      {/* Verification Result Section */}
      {result && (
        <div className={`verify-result ${result.status}`}>
          {/* VALID STATE: Certificate-style double bordered card with seal */}
          {result.status === "valid" && (
            <div className="cert-result-inner">
              <div className="cert-top-banner">
                <div className="seal-group">
                  <div className="seal-badge">
                    <svg
                      className="seal-svg"
                      width="42"
                      height="42"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="10" stroke="#15803d" strokeWidth="1.75" fill="#f0fdf4" />
                      <path d="M7.5 12l3 3 6-6" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="seal-text-wrap">
                    <span className="seal-kicker">BLOCKCHAIN VERIFIED</span>
                    <span className="seal-status-title">Authentic Certificate</span>
                  </div>
                </div>

                <button
                  className="btn btn-gold-outline btn-sm"
                  onClick={() => setSelectedCertForQr(result)}
                >
                  View QR Seal
                </button>
              </div>

              <div className="cert-recipient-banner">
                <span className="recipient-prefix">This credential is authenticated as issued to</span>
                <h3 className="recipient-name-serif">{result.recipient}</h3>
                <p className="cert-awarded-title">{result.title}</p>
              </div>

              <div className="cert-divider"></div>

              {/* Two-column Definition List */}
              <dl className="cert-dl-grid">
                <div className="dl-item">
                  <dt className="dl-term">Short Credential ID</dt>
                  <dd className="dl-def bold-id">{result.shortId}</dd>
                </div>
                <div className="dl-item">
                  <dt className="dl-term">Date of Record</dt>
                  <dd className="dl-def">{formatTimestamp(result.timestamp)}</dd>
                </div>
                <div className="dl-item dl-full">
                  <dt className="dl-term">Authorized Issuer Address</dt>
                  <dd className="dl-def mono">{result.issuer}</dd>
                </div>
                <div className="dl-item dl-full">
                  <dt className="dl-term">Cryptographic Document Digest</dt>
                  <dd className="dl-def mono">{result.hash}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* REVOKED STATE: Muted red card with stamp-style label */}
          {result.status === "revoked" && (
            <div className="cert-result-inner revoked-state">
              <div className="cert-top-banner">
                <div className="seal-group">
                  <div className="revoked-stamp-box">
                    <span className="revoked-stamp-text">REVOKED</span>
                  </div>
                  <div className="seal-text-wrap">
                    <span className="seal-kicker" style={{ color: "var(--revoked-red)" }}>OFFICIAL NOTICE</span>
                    <span className="seal-status-title" style={{ color: "var(--revoked-red)" }}>Credential Invalidated</span>
                  </div>
                </div>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setSelectedCertForQr(result)}
                >
                  View Record QR
                </button>
              </div>

              <div className="cert-recipient-banner">
                <span className="recipient-prefix">Certificate originally registered to</span>
                <h3 className="recipient-name-serif">{result.recipient}</h3>
                <p className="cert-awarded-title">{result.title}</p>
              </div>

              <div className="notice notice-warning" style={{ margin: "16px 0" }}>
                Notice: This credential was registered on the blockchain but has been officially revoked by an authorized authority.
              </div>

              <dl className="cert-dl-grid">
                <div className="dl-item">
                  <dt className="dl-term">Short Credential ID</dt>
                  <dd className="dl-def bold-id">{result.shortId}</dd>
                </div>
                <div className="dl-item">
                  <dt className="dl-term">Original Issue Date</dt>
                  <dd className="dl-def">{formatTimestamp(result.timestamp)}</dd>
                </div>
                <div className="dl-item dl-full">
                  <dt className="dl-term">Issuing Authority</dt>
                  <dd className="dl-def mono">{result.issuer}</dd>
                </div>
                <div className="dl-item dl-full">
                  <dt className="dl-term">Cryptographic Document Digest</dt>
                  <dd className="dl-def mono">{result.hash}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* NOT FOUND STATE: Neutral gray card with plain message */}
          {result.status === "not-found" && (
            <div className="not-found-card">
              <div className="not-found-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h4 className="not-found-title">Credential Not Found</h4>
              <p className="not-found-text">
                No official credential matching this document fingerprint exists in the blockchain registry.
              </p>
              <div className="not-found-hash-box">
                <span className="not-found-hash-label">Queried SHA-256 Digest:</span>
                <code className="not-found-hash-val">{result.hash}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCertForQr && (
        <QRCodeModal
          cert={selectedCertForQr}
          onClose={() => setSelectedCertForQr(null)}
        />
      )}
    </div>
  );
}
