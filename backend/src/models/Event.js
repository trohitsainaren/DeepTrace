const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['clipboard', 'file_access', 'ocr_detection', 'file_download', 'document_print'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  data: {
    content: {
      type: String,
      maxlength: 5000
    },
    filename: String,
    filepath: String,
    documentId: String,
    keywords: [String],
    application: String,
    windowTitle: String,
    ipAddress: String,
    userAgent: String,
    screenCapture: String, // base64 encoded
    metadata: mongoose.Schema.Types.Mixed
  },
  flagged: {
    type: Boolean,
    default: false
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  ruleTriggered: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rule'
  },
  notes: String,
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
eventSchema.index({ userId: 1, createdAt: -1 });
eventSchema.index({ type: 1, severity: 1 });
eventSchema.index({ flagged: 1, reviewed: 1 });

module.exports = mongoose.model('Event', eventSchema);