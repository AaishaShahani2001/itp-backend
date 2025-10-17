import dotenv from 'dotenv';
import { sendEmail } from './services/notify.js';

// Load environment variables
dotenv.config();

console.log('🔍 Detailed Email Test...');
console.log('📧 SMTP Host:', process.env.SMTP_HOST);
console.log('👤 SMTP User:', process.env.SMTP_USER);
console.log('📤 From Email:', process.env.FROM_EMAIL);
console.log('🔑 SMTP Pass length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'Not set');

// Test with multiple recipients
const testEmails = [
  'diludilush963@gmail.com',
  // Add another email if you have one
];

console.log('\n📬 Testing email delivery...');

async function testEmailDelivery() {
  for (const email of testEmails) {
    console.log(`\n📧 Sending to: ${email}`);
    
    try {
      await sendEmail({
        to: email,
        subject: `Test Email from PetPulse - ${new Date().toLocaleString()}`,
        text: `This is a test email sent at ${new Date().toLocaleString()}. If you receive this, your email setup is working!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #4CAF50; text-align: center;">✅ PetPulse Email Test</h1>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Recipient:</strong> ${email}</p>
            <p>If you receive this email, your Gmail SMTP configuration is working correctly!</p>
            <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
              <p><strong>Next steps:</strong></p>
              <ul>
                <li>Check your inbox and spam folder</li>
                <li>If received, your email system is ready!</li>
                <li>If not received, check Gmail security settings</li>
              </ul>
            </div>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated test message from PetPulse.</p>
          </div>
        `
      });
      
      console.log(`✅ Email sent successfully to ${email}`);
      console.log(`⏰ Sent at: ${new Date().toLocaleString()}`);
      console.log(`📬 Please check inbox and spam folder for ${email}`);
      
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error.message);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('1. Check your Gmail inbox');
  console.log('2. Check spam/junk folder');
  console.log('3. Wait 2-3 minutes for delivery');
  console.log('4. If still no email, check Gmail security settings');
}

testEmailDelivery();
