const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['keyword', 'time', 'document', 'behavioral', 'frequency'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  conditions: {
    keywords: [String],
    allowedHours: {
      start: { type: Number, min: 0, max: 23 },
      end: { type: Number, min: 0, max: 23 }
    },
    documentTypes: [String],
    userRoles: [String],
    departments: [String],
    maxFrequency: {
      count: Number,
      timeWindow: Number // in minutes
    },
    fileExtensions: [String],
    minFileSize: Number,
    maxFileSize: Number
  },
  actions: {
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    notify: {
      type: Boolean,
      default: true
    },
    block: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  },
  priority: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Rule', ruleSchema);
