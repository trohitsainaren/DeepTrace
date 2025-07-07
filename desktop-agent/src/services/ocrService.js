const { createWorker } = require('tesseract.js');
const screenshots = require('node-screenshots');
const apiClient = require('./apiClient');
const logger = require('../utils/logger');

class OCRService {
  constructor() {
    this.isRunning = false;
    this.worker = null;
    this.keywords = [];
    this.interval = null;
    this.onTextDetected = null;
  }

  async start(options = {}) {
    if (this.isRunning) return;

    this.keywords = options.keywords || [];
    this.onTextDetected = options.onTextDetected;

    try {
      // Initialize Tesseract worker
      this.worker = await createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');

      this.isRunning = true;

      // Start periodic screen scanning
      this.interval = setInterval(() => {
        this.scanScreen();
      }, 10000); // Scan every 10 seconds

      logger.info('OCR service started');
    } catch (error) {
      logger.error('Failed to start OCR service:', error);
    }
  }

  async stop() {
    if (!this.isRunning) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    this.isRunning = false;
    logger.info('OCR service stopped');
  }

  async scanScreen() {
    try {
      // Get all displays
      const displays = screenshots.all();
      
      for (const display of displays) {
        const image = await screenshots.fromDisplay(display.id);
        
        if (image) {
          const { data: { text } } = await this.worker.recognize(image);
          
          if (text && text.trim().length > 0) {
            await this.processDetectedText(text);
          }
        }
      }
    } catch (error) {
      logger.error('OCR scanning error:', error);
    }
  }

  async processDetectedText(text) {
    try {
      const containsKeywords = this.checkKeywords(text);
      const containsDocumentId = this.checkDocumentId(text);

      if (containsKeywords || containsDocumentId) {
        const eventData = {
          type: 'ocr_detection',
          data: {
            content: text.substring(0, 1000),
            containsKeywords,
            containsDocumentId,
            keywords: this.extractMatchedKeywords(text),
            documentId: this.extractDocumentIdFromText(text),
            timestamp: new Date().toISOString()
          }
        };

        // Send to API
        await apiClient.sendEvent(eventData);

        // Trigger callback
        if (this.onTextDetected) {
          this.onTextDetected(eventData);
        }

        logger.info('OCR detection event sent');
      }
    } catch (error) {
      logger.error('OCR processing error:', error);
    }
  }

  checkKeywords(text) {
    const lowerText = text.toLowerCase();
    return this.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  checkDocumentId(text) {
    const docIdPattern = /doc-id:[a-zA-Z0-9-]+/gi;
    return docIdPattern.test(text);
  }

  extractMatchedKeywords(text) {
    const lowerText = text.toLowerCase();
    return this.keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  extractDocumentIdFromText(text) {
    const docIdPattern = /doc-id:([a-zA-Z0-9-]+)/gi;
    const match = docIdPattern.exec(text);
    return match ? match[1] : null;
  }
}

module.exports = new OCRService();
