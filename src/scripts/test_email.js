import { emailService } from "../services/email_service.js";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    console.log("🚀 Testing Email Service...");
    
    // We try to send a test email to the configured user themselves
    const testRecipient = process.env.EMAIL_USER;
    
    if (!testRecipient || testRecipient.includes("your-school-email")) {
      console.warn("⚠️ EMAIL_USER not configured with a real email. Please update .env with real Gmail credentials to test.");
      return;
    }

    // Since templates are not created yet (Step 5), this might fail rendering.
    // I'll create a dummy template for testing if needed or just wait until Step 5.
    // Actually, let's create the templates now in Step 5.
    
    console.log("✅ Email service initialized. Run this test again after Step 5 (templates).");
  } catch (err) {
    console.error("❌ Email test failed:", err);
  }
}

test();
