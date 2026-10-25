import React, { useState, useEffect } from "react";
import {
  getReadOnlyContract,
  getSignerContract,
  getShortId,
  formatTimestamp,
  truncateAddress,
} from "../utils/ethereum";
import QRCodeModal from "./QRCodeModal";

export default function DashboardPage({ account, isIssuer, onConnectWallet, onNavigateVerify }) {
  const [certificates, setCertificates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [revokingHash, setRevokingHash] = useState(null);
  const [selectedCertForQr, setSelectedCertForQr] = useState(null);

  const fetchCertificates = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const contract = getReadOnlyContract();
      const hashes = await contract.getCertificateHashes();

      const items = [];
      for (const hash of hashes) {
        const certData = await contract.getCertificate(hash);
        items.push({
          hash: certData.certificateHash,
          issuer: certData.issuer,
          recipient: certData.recipient,
          title: certData.title,
          timestamp: certData.timestamp,
          revoked: certData.revoked,
          shortId: getShortId(certData.certificateHash),
        });
      }

      // Show newest first
      items.reverse();
      setCertificates(items);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Could not load certificates from the local network. Make sure the local node is running on http://127.0.0.1:8545."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleRevoke = async (hash) => {
    if (!account) {
      onConnectWallet();
      return;
    }

    if (!isIssuer) {
      alert("Only an authorized issuer wallet can revoke certificates.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to revoke this certificate? This action will permanently mark it as revoked on the blockchain."
    );
    if (!confirmed) return;

    setRevokingHash(hash);
    setErrorMessage("");

    try {
      const contract = await getSignerContract();
      const tx = await contract.revokeCertificate(hash);
      await tx.wait();
      await fetchCertificates();
    } catch (err) {
      console.error(err);
      if (err.reason) {
        setErrorMessage(err.reason);
      } else if (err.code === "ACTION_REJECTED") {
        setErrorMessage("Transaction was cancelled in wallet.");
      } else {
        setErrorMessage(err.message || "Failed to revoke certificate.");
      }
    } finally {
      setRevokingHash(null);
    }
  };

  const filteredCerts = certificates.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.recipient.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.shortId.toLowerCase().includes(q) ||
      c.hash.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="card">
        <div className="card-header-flex">
          <div>
            <span className="card-kicker">PUBLIC RECORD OF CREDENTIALS</span>
            <h2 className="card-title">Official Registry Ledger</h2>
            <p className="card-subtitle">
              Public decentralized archive of all authorized credentials registered on-chain ({certificates.length} records).
            </p>
          </div>
          <div>
            <button className="btn btn-outline btn-sm" onClick={fetchCertificates} disabled={isLoading}>
              {isLoading ? "Querying..." : "Refresh Ledger"}
            </button>
          </div>
        </div>

        {/* Filter / Search input */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search ledger by recipient name, qualification title, or credential short ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="notice notice-warning" style={{ marginBottom: "16px" }}>
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="empty-state">Querying blockchain registry...</div>
        ) : filteredCerts.length === 0 ? (
          <div className="empty-state">
            {searchQuery
              ? "No credentials match the queried criteria."
              : "No certificates recorded on the registry yet."}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Short ID</th>
                  <th>Recipient Name</th>
                  <th>Award / Qualification Title</th>
                  <th>Date Recorded</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCerts.map((cert) => (
                  <tr key={cert.hash}>
                    <td className="cell-id">
                      <code>{cert.shortId}</code>
                    </td>
                    <td className="cell-recipient">{cert.recipient}</td>
                    <td className="cell-title">{cert.title}</td>
                    <td className="cell-date">{formatTimestamp(cert.timestamp)}</td>
                    <td>
                      {cert.revoked ? (
                        <span className="badge badge-revoked">Revoked</span>
                      ) : (
                        <span className="badge badge-valid">Valid</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedCertForQr(cert)}
                          title="View official QR seal"
                        >
                          QR
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onNavigateVerify(cert.hash)}
                          title="Verify credential"
                        >
                          Verify
                        </button>
                        {!cert.revoked && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            disabled={revokingHash === cert.hash}
                            onClick={() => handleRevoke(cert.hash)}
                            title={
                              !account
                                ? "Connect authorized issuer wallet to revoke"
                                : !isIssuer
                                ? "Issuer permission required"
                                : "Revoke credential"
                            }
                          >
                            {revokingHash === cert.hash ? "Revoking..." : "Revoke"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCertForQr && (
        <QRCodeModal
          cert={selectedCertForQr}
          onClose={() => setSelectedCertForQr(null)}
        />
      )}
    </div>
  );
}
