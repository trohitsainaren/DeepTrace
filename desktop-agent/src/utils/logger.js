const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.deeptrace', 'logs');
    this.logFile = path.join(this.logDir, 'agent.log');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Write to file
    fs.appendFileSync(this.logFile, logLine);

    // Also log to console
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  getLogs(lines = 100) {
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n');
      return logLines.slice(-lines).map(line => JSON.parse(line));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new Logger();
