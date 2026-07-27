/**
 * Email Diagnostic Script
 * Run:  node src/scripts/test_email.js <your-test-email@example.com>
 *
 * Tests both Brevo HTTP API and Nodemailer SMTP independently,
 * prints detailed results for each.
 */
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import https from "https";
import nodemailer from "nodemailer";

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });
const testTo = process.argv[2];

if (!testTo) {
  console.error("Usage:  node src/scripts/test_email.js you@example.com");
  process.exit(1);
}

const divider = "─".repeat(55);

// ── 1. Brevo HTTP API Test ───────────────────────────────────────────────────
async function testBrevo() {
  console.log(`\n${divider}`);
  console.log("🔵 TEST 1 — Brevo HTTP API");
  console.log(divider);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log("⏭  BREVO_API_KEY is NOT set — skipping Brevo test.\n");
    return false;
  }

  console.log(`   API Key: ${apiKey.substring(0, 15)}...`);

  const senderEmail = process.env.EMAIL_USER || "hello@prophetbird.com";
  console.log(`   Sender:  ${senderEmail}`);
  console.log(`   To:      ${testTo}`);

  // First, check if the sender is verified in Brevo
  try {
    console.log("\n   📋 Checking verified senders in Brevo...");
    const sendersRes = await axios.get(
      "https://api.brevo.com/v3/senders",
      {
        headers: { "api-key": apiKey, "accept": "application/json" },
        httpsAgent: ipv4Agent,
        timeout: 10000,
      }
    );
    const senders = sendersRes.data?.senders || [];
    if (senders.length === 0) {
      console.log("   ⚠️  No verified senders found in your Brevo account!");
      console.log("   👉 Go to https://app.brevo.com/senders/list to add & verify a sender.");
    } else {
      console.log(`   ✅ Verified senders (${senders.length}):`);
      senders.forEach((s) => console.log(`      • ${s.name} <${s.email}> [active: ${s.active}]`));
      const match = senders.find(s => s.email.toLowerCase() === senderEmail.toLowerCase() && s.active);
      if (!match) {
        console.log(`\n   🔴 PROBLEM: "${senderEmail}" is NOT in the verified senders list!`);
        console.log(`   👉 Either verify "${senderEmail}" in Brevo, or change EMAIL_USER to a verified address.`);
      }
    }
  } catch (senderErr) {
    console.error("   ❌ Could not fetch Brevo senders:", senderErr.response?.data || senderErr.message);
  }

  // Try sending
  try {
    console.log("\n   📤 Sending test email via Brevo...");
    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "SchoolOS Test", email: senderEmail },
        to: [{ email: testTo }],
        subject: "[SchoolOS] Brevo API Test — " + new Date().toISOString(),
        htmlContent: "<h2>Brevo Test</h2><p>If you see this, Brevo HTTP API is working!</p>",
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        httpsAgent: ipv4Agent,
        timeout: 15000,
      }
    );
    console.log(`   ✅ Brevo SUCCESS! Response:`, JSON.stringify(res.data));
    return true;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data || {};
    console.error(`   ❌ Brevo FAILED!`);
    console.error(`      HTTP Status: ${status}`);
    console.error(`      Code:    ${data.code || "N/A"}`);
    console.error(`      Message: ${data.message || err.message}`);

    if (status === 401) {
      console.log("   👉 Your BREVO_API_KEY is invalid or expired. Generate a new one at:");
      console.log("      https://app.brevo.com/settings/keys/api");
    }
    if (data.code === "unauthorized" && data.message?.includes("unrecognised")) {
      console.log("   👉 Authorize your IP at: https://app.brevo.com/security/authorised_ips");
    }
    if (data.message?.includes("sender")) {
      console.log(`   👉 Verify "${senderEmail}" at: https://app.brevo.com/senders/list`);
    }
    return false;
  }
}

// ── 2. Nodemailer SMTP Test ──────────────────────────────────────────────────
async function testSMTP() {
  console.log(`\n${divider}`);
  console.log("🟢 TEST 2 — Nodemailer SMTP (Gmail)");
  console.log(divider);

  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user || "❌ NOT SET"}`);
  console.log(`   Pass: ${pass ? "✅ SET" : "❌ NOT SET"}`);

  if (!user || !pass) {
    console.log("\n   ⏭  Missing EMAIL_USER or EMAIL_PASS — cannot test SMTP.\n");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Verify connection
  try {
    console.log("\n   🔌 Verifying SMTP connection...");
    await transporter.verify();
    console.log("   ✅ SMTP connection verified successfully!");
  } catch (verifyErr) {
    console.error(`   ❌ SMTP connection FAILED: ${verifyErr.message}`);
    if (verifyErr.message.includes("Invalid login") || verifyErr.responseCode === 535) {
      console.log("   👉 Your Gmail App Password is invalid. Generate a new one:");
      console.log("      https://myaccount.google.com/apppasswords");
      console.log("   👉 Make sure 2-Step Verification is ON for your Google account.");
    }
    if (verifyErr.message.includes("ECONNREFUSED") || verifyErr.message.includes("ETIMEDOUT")) {
      console.log("   👉 Your network/firewall may be blocking port 587. Try port 465 with secure: true.");
    }
    return false;
  }

  // Try sending
  try {
    console.log("   📤 Sending test email via SMTP...");
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"SchoolOS Test" <${user}>`,
      to: testTo,
      subject: "[SchoolOS] SMTP Test — " + new Date().toISOString(),
      html: "<h2>SMTP Test</h2><p>If you see this, Nodemailer SMTP is working!</p>",
    });
    console.log(`   ✅ SMTP SUCCESS! MessageId: ${info.messageId}`);
    return true;
  } catch (sendErr) {
    console.error(`   ❌ SMTP send FAILED: ${sendErr.message}`);
    return false;
  }
}

// ── Run both ─────────────────────────────────────────────────────────────────
(async () => {
  console.log("📧 SchoolOS Email Diagnostics");
  console.log(`   Target: ${testTo}`);
  console.log(`   Time:   ${new Date().toISOString()}`);

  const brevoOk = await testBrevo();
  const smtpOk = await testSMTP();

  console.log(`\n${divider}`);
  console.log("📊 SUMMARY");
  console.log(divider);
  console.log(`   Brevo HTTP API:   ${brevoOk ? "✅ WORKING" : "❌ FAILED"}`);
  console.log(`   Nodemailer SMTP:  ${smtpOk ? "✅ WORKING" : "❌ FAILED"}`);

  if (!brevoOk && !smtpOk) {
    console.log("\n   🔴 BOTH methods failed — emails WILL NOT send.");
    console.log("   Fix at least one method to restore password reset functionality.");
  } else if (brevoOk) {
    console.log("\n   ✅ Brevo is working — emails should send successfully.");
  } else {
    console.log("\n   ⚠️  Only SMTP fallback is working — emails will send but may be slower.");
  }
  console.log("");
})();
