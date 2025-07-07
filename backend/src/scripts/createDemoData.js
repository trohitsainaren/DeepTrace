const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Rule = require('../models/Rule');
require('dotenv').config();
const MONGODB_URI=`mongodb+srv://trsnaren:4aiA5h3EyTJ8YtDq@cluster0.rfhs5er.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



async function createDemoData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // Check or create admin user
    let adminUser = await User.findOne({ email: 'adminREL@relanto.com' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'adminREL@relanto.com',
        username: 'BOSS',
        password: 'password123',
        role: 'admin',
        department: 'IT Security'
      });
      console.log('Created admin user');
    } else {
      console.log('Admin user already exists');
    }

    // Check or create developer user
    let devUser = await User.findOne({ email: 'dev@relato.com' });
    if (!devUser) {
      devUser = await User.create({
        email: 'dev@relato.com',
        username: 'ui-developer',
        password: 'password123',
        role: 'developer',
        department: 'Engineering'
      });
      console.log('Created developer user');
    } else {
      console.log('Developer user already exists');
    }

    // Check if demo events already exist
    const existingEvents = await Event.find({ userId: devUser._id });
    if (existingEvents.length === 0) {
      const events = [
        {
          userId: devUser._id,
          type: 'clipboard',
          severity: 'high',
          data: {
            content: 'confidential financial report Q4 2024',
            containsKeywords: true,
            timestamp: new Date()
          },
          flagged: true
        },
        {
          userId: devUser._id,
          type: 'file_access',
          severity: 'medium',
          data: {
            filename: 'salary_report.xlsx',
            filepath: '/Documents/salary_report.xlsx',
            action: 'opened',
            isSensitive: true
          }
        }
      ];
      await Event.insertMany(events);
      console.log('Demo events created');
    } else {
      console.log('Demo events already exist');
    }

    // Check if rule exists
    const existingRule = await Rule.findOne({ name: 'Sensitive Keywords Detection' });
    if (!existingRule) {
      const rules = [
        {
          name: 'Sensitive Keywords Detection',
          type: 'keyword',
          conditions: {
            keywords: ['confidential', 'secret', 'password', 'salary']
          },
          actions: {
            severity: 'high',
            notify: true
          },
          createdBy: adminUser._id
        }
      ];
      await Rule.insertMany(rules);
      console.log('Demo rules created');
    } else {
      console.log('Demo rule already exists');
    }

    console.log('✅ Demo data setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    process.exit(1);
  }
}

createDemoData();
