const axios = require('axios');
const Store = require('electron-store').default;
const logger = require('../utils/logger');
require('dotenv').config();

class APIClient {
  constructor() {
    this.store = new Store();
    this.baseURL = '';
    this.token = '';
    this.client = null;
  }

  async initialize(apiUrl) {
    this.baseURL = apiUrl;
    
    // Set token FIRST before creating client
    this.token = process.env.AUTH_TOKEN || this.store.get('authToken', '');
    
    if (process.env.AUTH_TOKEN) {
      this.store.set('authToken', process.env.AUTH_TOKEN);
      logger.info('Using AUTH_TOKEN from environment variable');
    }
    
    // Add debug logging
    logger.info('Token loaded:', this.token ? 'Token present' : 'No token found');

    this.client = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for auth - use arrow function to maintain 'this' context
    this.client.interceptors.request.use(
      (config) => {
        // Always get fresh token value
        const currentToken = this.token || this.store.get('authToken', '');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
          logger.info('Adding Authorization header to request');
        } else {
          logger.warn('No token available for request');
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.handleAuthError();
        }
        return Promise.reject(error);
      }
    );

    logger.info('API client initialized');
  }

  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password
      });

      this.token = response.data.token;
      this.store.set('authToken', this.token);
      this.store.set('userEmail', email);

      logger.info('Login successful');
      return response.data;
    } catch (error) {
      logger.error('Login failed:', error.message);
      throw error;
    }
  }

  async registerAgent(deviceInfo, userEmail) {
    try {
      const response = await this.client.post('/auth/agent-register', {
        agentId: deviceInfo.fingerprint,
        deviceInfo,
        userEmail
      });

      logger.info('Agent registered successfully');
      return response.data;
    } catch (error) {
      logger.error('Agent registration failed:', error.message);
      throw error;
    }
  }

  async sendEvent(eventData) {
    try {
      // Add debug logging before sending
      logger.info('Sending event with token:', this.token ? 'Token present' : 'No token');
      const response = await this.client.post('/events', eventData);
      logger.info('Event sent successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to send event:', error.message);
      throw error;
    }
  }

  async getEvents(params = {}) {
    try {
      const response = await this.client.get('/events', { params });
      return response.data;
    } catch (error) {
      logger.error('Failed to get events:', error.message);
      throw error;
    }
  }

  async getRules() {
    try {
      const response = await this.client.get('/rules');
      return response.data;
    } catch (error) {
      logger.error('Failed to get rules:', error.message);
      throw error;
    }
  }

  handleAuthError() {
    this.token = '';
    this.store.delete('authToken');
    logger.warn('Authentication error - token cleared');
  }

  isAuthenticated() {
    return !!this.token;
  }
}

module.exports = new APIClient();
