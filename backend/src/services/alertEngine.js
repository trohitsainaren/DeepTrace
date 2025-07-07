const nodemailer = require('nodemailer');

class AlertEngine {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendAlert(event, user, rule) {
    try {
      const alertData = {
        severity: event.severity,
        type: event.type,
        user: user.username,
        timestamp: event.createdAt,
        content: event.data.content?.substring(0, 100) + '...',
        rule: rule?.name
      };

      // Send email notification
      if (rule?.actions?.notify) {
        await this.sendEmailAlert(alertData);
      }

      // Send webhook notification
      if (process.env.WEBHOOK_URL) {
        await this.sendWebhookAlert(alertData);
      }

      console.log('Alert sent successfully:', alertData);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  async sendEmailAlert(alertData) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `DeepTrace Alert: ${alertData.severity.toUpperCase()} - ${alertData.type}`,
      html: `
        <h2>DeepTrace Security Alert</h2>
        <p><strong>Severity:</strong> ${alertData.severity}</p>
        <p><strong>Type:</strong> ${alertData.type}</p>
        <p><strong>User:</strong> ${alertData.user}</p>
        <p><strong>Time:</strong> ${alertData.timestamp}</p>
        <p><strong>Content:</strong> ${alertData.content}</p>
        <p><strong>Rule:</strong> ${alertData.rule}</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWebhookAlert(alertData) {
    const axios = require('axios');
    await axios.post(process.env.WEBHOOK_URL, alertData);
  }
}

module.exports = new AlertEngine();
