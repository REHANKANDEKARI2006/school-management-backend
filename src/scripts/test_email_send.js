import dotenv from 'dotenv';
dotenv.config();

import { emailService } from '../services/email_service.js';

console.log("Sending test invitation email...");
console.log("EMAIL_USER:", process.env.EMAIL_USER);

emailService.sendInvitation({
  to: process.env.EMAIL_USER,
  name: "Test User",
  role: "STUDENT",
  token: "test_token_12345",
  loginEmail: process.env.EMAIL_USER,
  instituteId: 3 // SunShine Public School
}).then((info) => {
  console.log("Test invitation email sent successfully!");
  console.log("MessageId:", info.messageId);
  process.exit(0);
}).catch((err) => {
  console.error("Test invitation email sending failed:", err);
  process.exit(1);
});
