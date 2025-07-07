const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const Rule = require('../models/Rule');
const { auth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? {} : { userId: req.user._id };

    // Get date range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const dateFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const filter = { ...userFilter, ...dateFilter };

    // Basic counts
    const [
      totalEvents,
      flaggedEvents,
      unreviewedEvents,
      criticalEvents,
      activeUsers,
      activeRules
    ] = await Promise.all([
      Event.countDocuments(filter),
      Event.countDocuments({ ...filter, flagged: true }),
      Event.countDocuments({ ...filter, reviewed: false }),
      Event.countDocuments({ ...filter, severity: 'critical' }),
      isAdmin ? User.countDocuments({ isActive: true }) : 1,
      isAdmin ? Rule.countDocuments({ isActive: true }) : 0
    ]);

    // Event types distribution
    const eventTypes = await Event.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Severity distribution
    const severityDistribution = await Event.aggregate([
      { $match: filter },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Daily activity (last 7 days)
    const dailyActivity = await Event.aggregate([
      { 
        $match: {
          ...userFilter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          flagged: { $sum: { $cond: ['$flagged', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top users (admin only)
    let topUsers = [];
    if (isAdmin) {
      topUsers = await Event.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$userId',
            eventCount: { $sum: 1 },
            flaggedCount: { $sum: { $cond: ['$flagged', 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            username: '$user.username',
            department: '$user.department',
            eventCount: 1,
            flaggedCount: 1
          }
        },
        { $sort: { eventCount: -1 } },
        { $limit: 10 }
      ]);
    }

    // Risk score trend
    const riskTrend = await Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          avgRiskScore: { $avg: '$riskScore' },
          maxRiskScore: { $max: '$riskScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: {
        totalEvents,
        flaggedEvents,
        unreviewedEvents,
        criticalEvents,
        activeUsers,
        activeRules
      },
      eventTypes,
      severityDistribution,
      dailyActivity,
      topUsers,
      riskTrend,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userFilter = req.user.role === 'admin' ? {} : { userId: req.user._id };

    const alerts = await Event.find({
      ...userFilter,
      $or: [
        { severity: { $in: ['high', 'critical'] } },
        { flagged: true }
      ]
    })
    .populate('userId', 'username department')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export events
router.get('/export', auth, requireAdmin, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const events = await Event.find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .populate('userId', 'username email department')
    .sort({ createdAt: -1 });

    if (format === 'csv') {
      const csv = events.map(event => ({
        id: event._id,
        username: event.userId.username,
        email: event.userId.email,
        department: event.userId.department,
        type: event.type,
        severity: event.severity,
        flagged: event.flagged,
        reviewed: event.reviewed,
        filename: event.data.filename,
        application: event.data.application,
        timestamp: event.createdAt
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
      
      const csvString = Object.keys(csv[0]).join(',') + '\n' + 
        csv.map(row => Object.values(row).join(',')).join('\n');
      
      res.send(csvString);
    } else {
      res.json(events);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;