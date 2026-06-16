import dotenv from 'dotenv';
dotenv.config();

import { emailService } from '../services/email_service.js';

console.log("Starting SMTP verification check...");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);

emailService.verify().then((res) => {
  console.log("SMTP verification check finished. Result:", res);
  process.exit(0);
}).catch((err) => {
  console.error("SMTP verification threw unexpected error:", err);
  process.exit(1);
});
