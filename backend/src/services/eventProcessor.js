const Rule = require('../models/Rule');

class EventProcessor {
  static async processEvent(event) {
    try {
      // Get all active rules
      const rules = await Rule.find({ isActive: true }).sort({ priority: -1 });
      
      let maxSeverity = 'low';
      let triggeredRule = null;
      let riskScore = 0;

      for (const rule of rules) {
        const ruleResult = await this.evaluateRule(event, rule);
        
        if (ruleResult.triggered) {
          triggeredRule = rule;
          event.flagged = true;
          
          // Update severity if higher
          if (this.getSeverityLevel(rule.actions.severity) > this.getSeverityLevel(maxSeverity)) {
            maxSeverity = rule.actions.severity;
          }
          
          riskScore += ruleResult.score;
          break; // Use first matching rule (highest priority)
        }
      }

      // Apply behavioral analysis
      const behavioralScore = await this.analyzeBehavior(event);
      riskScore += behavioralScore;

      event.severity = maxSeverity;
      event.ruleTriggered = triggeredRule?._id;
      event.riskScore = Math.min(riskScore, 100);

      return event;
    } catch (error) {
      console.error('Error processing event:', error);
      return event;
    }
  }

  static async evaluateRule(event, rule) {
    let triggered = false;
    let score = 0;

    switch (rule.type) {
      case 'keyword':
        triggered = this.checkKeywords(event, rule.conditions.keywords);
        score = triggered ? 25 : 0;
        break;
        
      case 'time':
        triggered = this.checkTimeWindow(event, rule.conditions.allowedHours);
        score = triggered ? 20 : 0;
        break;
        
      case 'document':
        triggered = this.checkDocumentType(event, rule.conditions.documentTypes);
        score = triggered ? 30 : 0;
        break;
        
      case 'frequency':
        triggered = await this.checkFrequency(event, rule.conditions.maxFrequency);
        score = triggered ? 40 : 0;
        break;
        
      case 'behavioral':
        const behavioralResult = await this.checkBehavioralPattern(event, rule);
        triggered = behavioralResult.triggered;
        score = behavioralResult.score;
        break;
    }

    return { triggered, score };
  }

  static checkKeywords(event, keywords) {
    if (!keywords || keywords.length === 0) return false;
    
    const content = (event.data.content || '').toLowerCase();
    const filename = (event.data.filename || '').toLowerCase();
    
    return keywords.some(keyword => 
      content.includes(keyword.toLowerCase()) || 
      filename.includes(keyword.toLowerCase())
    );
  }

  static checkTimeWindow(event, allowedHours) {
    if (!allowedHours || allowedHours.start === undefined || allowedHours.end === undefined) {
      return false;
    }
    
    const eventHour = new Date(event.createdAt || new Date()).getHours();
    
    // Check if event is outside allowed hours
    if (allowedHours.start < allowedHours.end) {
      return eventHour < allowedHours.start || eventHour > allowedHours.end;
    } else {
      // Handle overnight window (e.g., 22:00 to 06:00)
      return eventHour < allowedHours.start && eventHour > allowedHours.end;
    }
  }

  static checkDocumentType(event, documentTypes) {
    if (!documentTypes || documentTypes.length === 0) return false;
    
    const filename = event.data.filename || '';
    const extension = filename.split('.').pop()?.toLowerCase();
    
    return documentTypes.some(type => 
      filename.toLowerCase().includes(type.toLowerCase()) ||
      extension === type.toLowerCase()
    );
  }

  static async checkFrequency(event, maxFrequency) {
    if (!maxFrequency || !maxFrequency.count || !maxFrequency.timeWindow) {
      return false;
    }
    
    const Event = require('../models/Event');
    const timeWindow = new Date(Date.now() - maxFrequency.timeWindow * 60 * 1000);
    
    const recentEvents = await Event.countDocuments({
      userId: event.userId,
      type: event.type,
      createdAt: { $gte: timeWindow }
    });
    
    return recentEvents >= maxFrequency.count;
  }

  static async checkBehavioralPattern(event, rule) {
    // Advanced behavioral analysis
    const Event = require('../models/Event');
    
    // Get user's recent activity
    const recentActivity = await Event.find({
      userId: event.userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    let score = 0;
    let triggered = false;
    
    // Check for unusual activity patterns
    if (recentActivity.length === 0) {
      // First time user activity
      score += 10;
    } else {
      // Check for burst activity
      const hourlyActivity = {};
      recentActivity.forEach(activity => {
        const hour = new Date(activity.createdAt).getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });
      
      const maxHourlyActivity = Math.max(...Object.values(hourlyActivity));
      if (maxHourlyActivity > 10) {
        score += 20;
        triggered = true;
      }
    }
    
    // Check for off-hours activity
    const eventHour = new Date().getHours();
    if (eventHour < 6 || eventHour > 22) {
      score += 15;
      triggered = true;
    }
    
    return { triggered, score };
  }

  static async analyzeBehavior(event) {
    const Event = require('../models/Event');
    
    // Get user's historical behavior
    const userEvents = await Event.find({
      userId: event.userId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    let behavioralScore = 0;
    
    // Analyze patterns
    const eventsByHour = {};
    userEvents.forEach(e => {
      const hour = new Date(e.createdAt).getHours();
      eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
    });
    
    // Current event hour
    const currentHour = new Date().getHours();
    const normalActivity = eventsByHour[currentHour] || 0;
    
    // Score based on deviation from normal
    if (normalActivity === 0) {
      behavioralScore += 15; // New time pattern
    } else if (normalActivity < 2) {
      behavioralScore += 10; // Unusual time
    }
    
    // Check for rapid succession
    const lastEvent = userEvents[userEvents.length - 1];
    if (lastEvent) {
      const timeDiff = Date.now() - new Date(lastEvent.createdAt).getTime();
      if (timeDiff < 60000) { // Less than 1 minute
        behavioralScore += 20;
      }
    }
    
    return behavioralScore;
  }

  static getSeverityLevel(severity) {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] || 1;
  }
}

module.exports = { processEvent: EventProcessor.processEvent.bind(EventProcessor) };