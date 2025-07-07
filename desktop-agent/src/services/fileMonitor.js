const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const apiClient = require('./apiClient');
const logger = require('../utils/logger');
const { injectDocumentId, extractDocumentId } = require('../utils/fingerprint');

class FileMonitor {
  constructor() {
    this.watchers = [];
    this.isRunning = false;
    this.onFileAccess = null;
  }

start(options = {}) {
  if (this.isRunitoring) return;

  const folders = options.folders || [];
  this.onFileAccess = options.onFileAccess;

  folders.forEach(folder => {
    if (fs.existsSync(folder)) {
      try {
        const watcher = chokidar.watch(folder, {
          persistent: true,
          ignoreInitial: true,
          depth: 2, // Limit depth to avoid deep system folders
          ignored: [
            /(^|[\/\\])\../, // Hidden files
            /node_modules/,
            /\.git/,
            /My Music/,
            /My Videos/,
            /My Pictures/ // Skip problematic Windows folders
          ],
        });

        watcher
          .on('add', (filePath) => this.handleFileEvent('created', filePath))
          .on('change', (filePath) => this.handleFileEvent('modified', filePath))
          .on('unlink', (filePath) => this.handleFileEvent('deleted', filePath))
          .on('error', (error) => {
            console.warn('File watcher error (non-critical):', error.message);
          });

        this.watchers.push(watcher);
      } catch (error) {
        console.warn(`Cannot monitor folder ${folder}:`, error.message);
      }
    }
  });

  this.isRunning = true;
  logger.info(`File monitoring started for ${this.watchers.length} accessible folders`);
}


  stop() {
    if (!this.isRunning) return;

    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    this.isRunning = false;
    
    logger.info('File monitoring stopped');
  }

  async handleFileEvent(action, filePath) {
    try {
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      const filename = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();

      // Check if it's a sensitive file type
      const sensitiveExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.csv'];
      const isSensitive = sensitiveExtensions.includes(extension);

      const eventData = {
        type: 'file_access',
        data: {
          filename,
          filepath: filePath,
          action,
          extension,
          size: stats ? stats.size : 0,
          isSensitive,
          timestamp: new Date().toISOString()
        }
      };

      // Extract document ID if present
      if (action === 'created' && isSensitive) {
        const docId = await extractDocumentId(filePath);
        if (docId) {
          eventData.data.documentId = docId;
        }
      }

      // Inject document ID for new sensitive files
      if (action === 'created' && isSensitive && !eventData.data.documentId) {
        const docId = await injectDocumentId(filePath);
        eventData.data.documentId = docId;
      }

      // Send to API
      await apiClient.sendEvent(eventData);

      // Trigger callback
      if (this.onFileAccess) {
        this.onFileAccess(eventData);
      }

      logger.info(`File event: ${action} - ${filename}`);
    } catch (error) {
      logger.error('File monitoring error:', error);
    }
  }
}

module.exports = new FileMonitor();
