import 'dotenv/config';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

try {
  const msg = await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER, 
    to: '+94xxxxxxxxx',                   // your verified Lankan mobile
    body: 'PetPulse SMS OK (trial test)',
  });
  console.log('✅ Sent. SID:', msg.sid, 'Status:', msg.status);
} catch (e) {
  console.error('❌ SMS failed:', e?.code, e?.message);
}
