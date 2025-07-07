const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateEvent = [
  body('type').isIn(['clipboard', 'file_access', 'ocr_detection', 'file_download', 'document_print']),
  body('data.content').optional().isLength({ max: 5000 }),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  validateRequest
];

const validateRule = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('type').isIn(['keyword', 'time', 'document', 'behavioral', 'frequency']),
  body('conditions').isObject(),
  body('actions').isObject(),
  validateRequest
];

const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).trim(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'developer', 'user']),
  validateRequest
];

module.exports = {
  validateEvent,
  validateRule,
  validateUser,
  validateRequest
};
