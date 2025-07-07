const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

function generateDeviceFingerprint() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus();
  const networkInterfaces = os.networkInterfaces();

  const fingerprint = crypto
    .createHash('sha256')
    .update(`${hostname}-${platform}-${arch}-${JSON.stringify(cpus)}-${JSON.stringify(networkInterfaces)}`)
    .digest('hex');

  return fingerprint.substring(0, 16);
}

async function injectDocumentId(filePath) {
  try {
    const docId = `doc-id:${crypto.randomBytes(8).toString('hex')}`;
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.txt') {
      // For text files, append as comment
      const content = fs.readFileSync(filePath, 'utf8');
      const newContent = `${content}\n<!-- ${docId} -->`;
      fs.writeFileSync(filePath, newContent);
    } else if (extension === '.pdf') {
      // For PDFs, we'll simulate by creating a metadata file
      const metadataPath = filePath + '.metadata';
      fs.writeFileSync(metadataPath, JSON.stringify({ documentId: docId }));
    }

    return docId;
  } catch (error) {
    console.error('Failed to inject document ID:', error);
    return null;
  }
}

async function extractDocumentId(filePath) {
  try {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      const match = content.match(/doc-id:([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    } else if (extension === '.pdf') {
      const metadataPath = filePath + '.metadata';
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return metadata.documentId;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to extract document ID:', error);
    return null;
  }
}

module.exports = {
  generateDeviceFingerprint,
  injectDocumentId,
  extractDocumentId
};
