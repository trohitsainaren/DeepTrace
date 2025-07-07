const express = require('express');
const Rule = require('../models/Rule');
const { auth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all rules
router.get('/', auth, async (req, res) => {
  try {
    const rules = await Rule.find()
      .populate('createdBy', 'username')
      .sort({ priority: -1, createdAt: -1 });

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get rule by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new rule
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      createdBy: req.user._id
    };

    const rule = new Rule(ruleData);
    await rule.save();

    const populatedRule = await Rule.findById(rule._id)
      .populate('createdBy', 'username');

    res.status(201).json({
      message: 'Rule created successfully',
      rule: populatedRule
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update rule
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      message: 'Rule updated successfully',
      rule
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete rule
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle rule activation
router.patch('/:id/toggle', auth, requireAdmin, async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({
      message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      rule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;