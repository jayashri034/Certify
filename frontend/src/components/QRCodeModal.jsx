import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRCodeModal({ cert, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!cert) return null;

  const verifyUrl = `${window.location.origin}/?tab=verify&hash=${cert.hash}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Certificate Details & QR</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
            {cert.title}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Issued to {cert.recipient}
          </p>

          <div className="qr-wrapper">
            <QRCodeSVG value={verifyUrl} size={180} level="M" />
          </div>

          <p style={{ fontSize: "12px", color: "var(--text-subtle)", marginBottom: "8px" }}>
            Scan to instantly verify this certificate on any device
          </p>

          <div
            style={{
              padding: "10px",
              background: "#f4f4f5",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              wordBreak: "break-all",
              textAlign: "left",
              marginBottom: "16px",
            }}
          >
            <div><strong>ID:</strong> {cert.shortId}</div>
            <div style={{ marginTop: "4px" }}><strong>Hash:</strong> {cert.hash}</div>
          </div>

          <div className="btn-group" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? "Link Copied" : "Copy Verification Link"}
            </button>
            <button className="btn btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
