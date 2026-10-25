// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @dev Stores SHA-256 hashes of certificates on-chain and verifies their validity.
 */
contract CertificateRegistry {
    address public owner;

    struct Certificate {
        bytes32 certificateHash;
        address issuer;
        string recipient;
        string title;
        uint256 timestamp;
        bool revoked;
        bool exists;
    }

    // Mapping from certificate SHA-256 hash to Certificate record
    mapping(bytes32 => Certificate) private certificates;

    // Ordered list of certificate hashes for dashboard enumeration
    bytes32[] private certificateHashes;

    // Authorized issuers whitelist
    mapping(address => bool) public isIssuer;

    // Events
    event CertificateIssued(
        bytes32 indexed certificateHash,
        address indexed issuer,
        string recipient,
        string title,
        uint256 timestamp
    );

    event CertificateRevoked(
        bytes32 indexed certificateHash,
        address indexed revoker,
        uint256 timestamp
    );

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "Caller is not an authorized issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
        emit IssuerAdded(msg.sender);
    }

    /**
     * @dev Add a new authorized certificate issuer.
     */
    function addIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "Invalid issuer address");
        require(!isIssuer[_issuer], "Address is already an issuer");
        isIssuer[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    /**
     * @dev Remove an authorized certificate issuer.
     */
    function removeIssuer(address _issuer) external onlyOwner {
        require(isIssuer[_issuer], "Address is not an issuer");
        require(_issuer != owner, "Cannot remove contract owner from issuers");
        isIssuer[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    /**
     * @dev Issues a new certificate by storing its SHA-256 hash and metadata on-chain.
     * @param hash SHA-256 digest of the certificate document
     * @param recipient Name of the recipient
     * @param title Title of the certificate or course
     */
    function issueCertificate(
        bytes32 hash,
        string calldata recipient,
        string calldata title
    ) external onlyIssuer {
        require(hash != bytes32(0), "Invalid certificate hash");
        require(bytes(recipient).length > 0, "Recipient cannot be empty");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(!certificates[hash].exists, "Certificate hash already registered");

        certificates[hash] = Certificate({
            certificateHash: hash,
            issuer: msg.sender,
            recipient: recipient,
            title: title,
            timestamp: block.timestamp,
            revoked: false,
            exists: true
        });

        certificateHashes.push(hash);

        emit CertificateIssued(hash, msg.sender, recipient, title, block.timestamp);
    }

    /**
     * @dev Revokes an existing certificate.
     * @param hash SHA-256 digest of the certificate
     */
    function revokeCertificate(bytes32 hash) external onlyIssuer {
        require(certificates[hash].exists, "Certificate not found");
        require(!certificates[hash].revoked, "Certificate is already revoked");

        certificates[hash].revoked = true;

        emit CertificateRevoked(hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verifies a certificate by hash.
     * Returns zero values if not found.
     */
    function verifyCertificate(bytes32 hash)
        external
        view
        returns (
            address issuer,
            string memory recipient,
            string memory title,
            uint256 timestamp,
            bool revoked
        )
    {
        Certificate memory cert = certificates[hash];
        return (
            cert.issuer,
            cert.recipient,
            cert.title,
            cert.timestamp,
            cert.revoked
        );
    }

    /**
     * @dev Checks if a certificate exists.
     */
    function certificateExists(bytes32 hash) external view returns (bool) {
        return certificates[hash].exists;
    }

    /**
     * @dev Returns total number of registered certificates.
     */
    function getCertificateCount() external view returns (uint256) {
        return certificateHashes.length;
    }

    /**
     * @dev Returns all certificate hashes.
     */
    function getCertificateHashes() external view returns (bytes32[] memory) {
        return certificateHashes;
    }

    /**
     * @dev Returns full certificate details including exists flag.
     */
    function getCertificate(bytes32 hash)
        external
        view
        returns (
            bytes32 certificateHash,
            address issuer,
            string memory recipient,
            string memory title,
            uint256 timestamp,
            bool revoked,
            bool exists
        )
    {
        Certificate memory cert = certificates[hash];
        return (
            cert.certificateHash,
            cert.issuer,
            cert.recipient,
            cert.title,
            cert.timestamp,
            cert.revoked,
            cert.exists
        );
    }
}
