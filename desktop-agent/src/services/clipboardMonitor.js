const { clipboard } = require('electron');
const apiClient = require('./apiClient');
const logger = require('../utils/logger');

class ClipboardMonitor {
  constructor() {
    this.isRunning = false;
    this.lastContent = '';
    this.keywords = [];
    this.interval = null;
    this.onClipboardChange = null;
  }

  start(options = {}) {
    if (this.isRunning) return;

    this.keywords = options.keywords || [];
    this.onClipboardChange = options.onClipboardChange;
    this.isRunning = true;

    this.interval = setInterval(() => {
      this.checkClipboard();
    }, 500);

    logger.info('Clipboard monitoring started');
  }

  stop() {
    if (!this.isRunning) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    logger.info('Clipboard monitoring stopped');
  }

  async checkClipboard() {
    try {
      const content = clipboard.readText();
      
      if (content && content !== this.lastContent && content.length > 0) {
        this.lastContent = content;
        
        const eventData = {
          type: 'clipboard',
          data: {
            content: content.substring(0, 1000), // Limit content length
            length: content.length,
            containsKeywords: this.checkKeywords(content),
            timestamp: new Date().toISOString()
          }
        };

        // Send to API
        await apiClient.sendEvent(eventData);

        // Trigger callback
        if (this.onClipboardChange) {
          this.onClipboardChange(eventData);
        }

        logger.info('Clipboard event detected and sent');
      }
    } catch (error) {
      logger.error('Clipboard monitoring error:', error);
    }
  }

  checkKeywords(content) {
    const lowerContent = content.toLowerCase();
    return this.keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }
}

module.exports = new ClipboardMonitor();
