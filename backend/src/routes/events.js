const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { auth, requireAdmin } = require('../middleware/auth');
const { processEvent } = require('../services/eventProcessor');
const router = express.Router();

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// Create new event (from desktop agent)
router.post('/', auth, async (req, res) => {
  try {
    const eventData = {
      userId: req.user._id,
      type: req.body.type,
      data: req.body.data,
      severity: req.body.severity || 'low'
    };

    const event = new Event(eventData);
    
    // Process event through rule engine
    const processedEvent = await processEvent(event);
    
    await processedEvent.save();

    // Emit real-time event to dashboard
    if (req.io) {
      req.io.emit('new-event', {
        id: processedEvent._id,
        type: processedEvent.type,
        severity: processedEvent.severity,
        user: req.user.username,
        timestamp: processedEvent.createdAt,
        flagged: processedEvent.flagged
      });
    }

    res.status(201).json({
      message: 'Event recorded successfully',
      event: processedEvent
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get events (with filters and pagination)
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.flagged !== undefined) filter.flagged = req.query.flagged === 'true';
    if (req.query.reviewed !== undefined) filter.reviewed = req.query.reviewed === 'true';
    
    // Validate userId if provided
    if (req.query.userId) {
      if (!isValidObjectId(req.query.userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }
      filter.userId = new mongoose.Types.ObjectId(req.query.userId);
    }

    // Date range filter with validation
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate format' });
        }
        filter.createdAt.$gte = startDate;
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format' });
        }
        filter.createdAt.$lte = endDate;
      }
    }

    // Only admins can see all events
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const events = await Event.find(filter)
      .populate('userId', 'username email department')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    const total = await Event.countDocuments(filter);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    const event = await Event.findById(id)
      .populate('userId', 'username email department')
      .populate('reviewedBy', 'username')
      .populate('ruleTriggered', 'name type');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && event.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update event (review, flag, etc.)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only admins can update events
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = {};
    
    if (req.body.reviewed !== undefined) {
      updates.reviewed = req.body.reviewed;
      updates.reviewedBy = req.user._id;
      updates.reviewedAt = new Date();
    }
    
    if (req.body.flagged !== undefined) updates.flagged = req.body.flagged;
    if (req.body.notes) updates.notes = req.body.notes;
    if (req.body.severity) {
      // Validate severity value
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(req.body.severity)) {
        return res.status(400).json({ error: 'Invalid severity level' });
      }
      updates.severity = req.body.severity;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'username email');

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await Event.findByIdAndDelete(id);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk operations with enhanced ObjectId validation
router.post('/bulk-action', auth, requireAdmin, async (req, res) => {
  try {
    const { eventIds, action, value } = req.body;
    
    // Validate input
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds must be a non-empty array' });
    }

    // Validate all ObjectIds
    const validObjectIds = [];
    const invalidIds = [];
    
    for (const id of eventIds) {
      if (isValidObjectId(id)) {
        validObjectIds.push(new mongoose.Types.ObjectId(id));
      } else {
        invalidIds.push(id);
      }
    }
    
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid ObjectId format',
        invalidIds: invalidIds
      });
    }
    
    if (validObjectIds.length === 0) {
      return res.status(400).json({ error: 'No valid event IDs provided' });
    }

    const updates = {};
    
    switch (action) {
      case 'review':
        updates.reviewed = value;
        updates.reviewedBy = req.user._id;
        updates.reviewedAt = new Date();
        break;
      case 'flag':
        updates.flagged = value;
        break;
      case 'severity':
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(value)) {
          return res.status(400).json({ error: 'Invalid severity level' });
        }
        updates.severity = value;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Must be: review, flag, or severity' });
    }

    const result = await Event.updateMany(
      { _id: { $in: validObjectIds } },
      updates
    );

    res.json({ 
      message: `${result.modifiedCount} events updated successfully`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      processedIds: validObjectIds.length
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Additional route: Get event statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const filter = req.user.role !== 'admin' ? { userId: req.user._id } : {};
    
    const stats = await Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          flagged: { $sum: { $cond: ['$flagged', 1, 0] } },
          reviewed: { $sum: { $cond: ['$reviewed', 1, 0] } },
          severityBreakdown: {
            $push: '$severity'
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          flagged: 1,
          reviewed: 1,
          unreviewed: { $subtract: ['$total', '$reviewed'] },
          severityBreakdown: 1
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      flagged: 0,
      reviewed: 0,
      unreviewed: 0,
      severityBreakdown: []
    };

    res.json(result);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
