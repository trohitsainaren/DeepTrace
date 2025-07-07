const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store').default;
const clipboardMonitor = require('../services/clipboardMonitor');
const fileMonitor = require('../services/fileMonitor');
const ocrService = require('../services/ocrService');
const apiClient = require('../services/apiClient');
const { generateDeviceFingerprint } = require('../utils/fingerprint');
const logger = require('../utils/logger');

class DeepTraceAgent {
  constructor() {
    this.store = new Store();
    this.mainWindow = null;
    this.tray = null;
    this.isMonitoring = false;
    this.config = {
      apiUrl: 'http://localhost:5000',
      monitoredFolders: [],
      keywords: [],
      enabled: true,
      ocrEnabled: false
    };
  }

  async initialize() {
    try {
      this.loadConfig();
      await apiClient.initialize(this.config.apiUrl);
      await this.registerDevice();
      this.createMainWindow();
      this.createTray();
      
      if (this.config.enabled) {
        await this.startMonitoring();
      }
      
      logger.info('DeepTrace Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      this.showError('Failed to initialize DeepTrace Agent');
    }
  }

  loadConfig() {
    const savedConfig = this.store.get('config');
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }
    
    // Replace the default monitored folders
    if (this.config.monitoredFolders.length === 0) {
    this.config.monitoredFolders = [
        path.join(require('os').homedir(), 'Documents'),
        path.join(require('os').homedir(), 'Downloads'),
        path.join(require('os').homedir(), 'Desktop')
        // Remove system folders like 'My Music', 'My Videos'
    ];
    }

    
    if (this.config.keywords.length === 0) {
      this.config.keywords = [
        'confidential', 'secret', 'internal', 'private',
        'password', 'api_key', 'token', 'credential',
        'proposal', 'contract', 'financial', 'salary'
      ];
    }
  }

  saveConfig() {
    this.store.set('config', this.config);
  }

  async registerDevice() {
    try {
      const deviceInfo = {
        hostname: require('os').hostname(),
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        fingerprint: generateDeviceFingerprint()
      };
      
      const userEmail = this.store.get('userEmail');
      if (userEmail) {
        await apiClient.registerAgent(deviceInfo, userEmail);
        logger.info('Device registered successfully');
      }
    } catch (error) {
      logger.error('Failed to register device:', error);
    }
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    
    this.mainWindow.on('close', (event) => {
      event.preventDefault();
      this.mainWindow.hide();
    });
  }

  createTray() {
    // Create a simple tray icon (you can replace with actual icon)
    this.tray = new Tray(this.createTrayIcon());
    
    this.updateTrayMenu();
    this.tray.setToolTip('DeepTrace Agent');
    
    this.tray.on('double-click', () => {
      this.showSettings();
    });
  }

  createTrayIcon() {
    // Create a simple 16x16 icon programmatically
    const { nativeImage } = require('electron');
    const canvas = require('canvas');
    const canvasInstance = canvas.createCanvas(16, 16);
    const ctx = canvasInstance.getContext('2d');
    
    // Draw a simple circle
    ctx.fillStyle = '#007acc';
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    return nativeImage.createFromDataURL(canvasInstance.toDataURL());
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'DeepTrace Agent',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: this.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring',
        type: 'normal',
        click: () => {
          if (this.isMonitoring) {
            this.stopMonitoring();
          } else {
            this.startMonitoring();
          }
        }
      },
      {
        label: 'Open Dashboard',
        type: 'normal',
        click: () => {
          shell.openExternal('http://localhost:3000');
        }
      },
      {
        label: 'Settings',
        type: 'normal',
        click: () => {
          this.showSettings();
        }
      },
      { type: 'separator' },
      {
        label: 'View Logs',
        type: 'normal',
        click: () => {
          this.showLogs();
        }
      },
      {
        label: 'About',
        type: 'normal',
        click: () => {
          this.showAbout();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        type: 'normal',
        click: () => {
          this.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  async startMonitoring() {
    try {
      if (this.isMonitoring) return;
      
      logger.info('Starting monitoring services...');
      
      clipboardMonitor.start({
        keywords: this.config.keywords,
        onClipboardChange: (data) => this.handleClipboardEvent(data)
      });
      
      fileMonitor.start({
        folders: this.config.monitoredFolders,
        onFileAccess: (data) => this.handleFileEvent(data)
      });
      
      if (this.config.ocrEnabled) {
        await ocrService.start({
          keywords: this.config.keywords,
          onTextDetected: (data) => this.handleOcrEvent(data)
        });
      }
      
      this.isMonitoring = true;
      this.updateTrayMenu();
      
      logger.info('All monitoring services started');
    } catch (error) {
      logger.error('Failed to start monitoring:', error);
      this.showError('Failed to start monitoring services');
    }
  }

  async stopMonitoring() {
    try {
      logger.info('Stopping monitoring services...');
      
      clipboardMonitor.stop();
      fileMonitor.stop();
      await ocrService.stop();
      
      this.isMonitoring = false;
      this.updateTrayMenu();
      
      logger.info('All monitoring services stopped');
    } catch (error) {
      logger.error('Failed to stop monitoring:', error);
    }
  }

  handleClipboardEvent(data) {
    logger.info('Clipboard event handled:', data.type);
  }

  handleFileEvent(data) {
    logger.info('File event handled:', data.data.action, data.data.filename);
  }

  handleOcrEvent(data) {
    logger.info('OCR event handled:', data.type);
  }

  showSettings() {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  showLogs() {
    const logs = logger.getLogs(50);
    dialog.showMessageBox({
      type: 'info',
      title: 'Recent Logs',
      message: 'Recent log entries:',
      detail: logs.map(log => `${log.timestamp} [${log.level}]: ${log.message}`).join('\n')
    });
  }

  showAbout() {
    dialog.showMessageBox({
      type: 'info',
      title: 'About DeepTrace Agent',
      message: 'DeepTrace Agent v1.0.0',
      detail: 'Zero-Trust Insider Threat Detection System\nMonitoring clipboard, file access, and OCR detection.'
    });
  }

  showError(message) {
    dialog.showErrorBox('DeepTrace Agent Error', message);
  }

  quit() {
    this.stopMonitoring();
    app.quit();
  }
}

// Handle token updates from renderer
ipcMain.on('update-token', async (event, { token, user }) => {
  try {
    // Update API client with new token
    apiClient.token = token;
    apiClient.currentUser = user;
    apiClient.store.set('authToken', token);
    apiClient.store.set('currentUser', user);
    
    logger.info(`Token updated for user: ${user.username}`);
    
    // Re-register device with new user context
    await agent.registerDevice();
  } catch (error) {
    logger.error('Failed to update token:', error);
  }
});

// Handle logout
ipcMain.on('logout', async (event) => {
  try {
    await apiClient.logout();
    logger.info('User logged out via settings');
  } catch (error) {
    logger.error('Logout error:', error);
  }
});

// Handle settings updates
ipcMain.on('save-settings', (event, settings) => {
  try {
    agent.config = { ...agent.config, ...settings };
    agent.saveConfig();
    logger.info('Settings updated via UI');
  } catch (error) {
    logger.error('Settings save error:', error);
  }
});
// Initialize the agent
const agent = new DeepTraceAgent();

app.whenReady().then(() => {
  agent.initialize();
});

app.on('window-all-closed', () => {
  // Keep the app running in the background
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    agent.createMainWindow();
  }
});

module.exports = agent;
