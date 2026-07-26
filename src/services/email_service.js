import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { SchoolProfileModel } from "../models/school_profile_model.js";
import axios from "axios";
import https from "https";

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      pool: true,
      maxConnections: 5,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Verify email configuration — call this on server startup.
   * Logs exactly which email method is configured so you can confirm in Railway logs.
   */
  async verify() {
    console.log("─────────────────────────────────────────────────");
    console.log("📧 [EMAIL SERVICE] Startup Configuration Check:");
    console.log(`   BREVO_API_KEY: ${process.env.BREVO_API_KEY ? "✅ SET (" + process.env.BREVO_API_KEY.substring(0, 12) + "...)" : "❌ NOT SET"}`);
    console.log(`   EMAIL_USER (sender): ${process.env.EMAIL_USER || "❌ NOT SET"}`);
    console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || "(default: smtp.gmail.com)"}`);
    console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || "(default: 587)"}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? "✅ SET" : "❌ NOT SET"}`);
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || "❌ NOT SET (will use request origin)"}`);
    console.log("─────────────────────────────────────────────────");

    if (process.env.BREVO_API_KEY) {
      console.log("⚡ Primary Email Method: Brevo HTTP REST API (v3)");
    }

    try {
      await this.transporter.verify();
      console.log("✅ Fallback Email Method (Nodemailer SMTP) verified.");
      return true;
    } catch (error) {
      if (process.env.BREVO_API_KEY) {
        console.log("ℹ️ Fallback SMTP verification skipped or failed, but Primary Brevo HTTP API is active.");
        return true;
      }
      console.error("❌ Email service verification FAILED:", error.message);
      return false;
    }
  }

  async sendEmail({ to, subject, templateName, templateData, instituteId }) {
    const callId = `EMAIL-${Date.now().toString(36).toUpperCase()}`;
    console.log(`\n📧 [${callId}] sendEmail() CALLED — to: ${to}, subject: "${subject}", template: ${templateName}`);

    let html = "";
    try {
      // Fetch school branding info (falls back to Sunshine Public School ID 3 instead of ID 1)
      const schoolProfile = await SchoolProfileModel.getProfile(instituteId || 3);
      const branding = {
        schoolName: schoolProfile?.school_name || "SchoolOS",
        logoUrl: schoolProfile?.logo_url || "https://res.cloudinary.com/dmrin51u8/image/upload/v1713550000/logo_placeholder.png",
        primaryColor: schoolProfile?.primary_color || "#3b82f6",
      };

      // Compile EJS template
      const templatePath = path.join(__dirname, `../templates/auth/${templateName}.ejs`);
      html = await ejs.renderFile(templatePath, { ...templateData, branding });
      console.log(`📧 [${callId}] Template rendered successfully (${html.length} chars)`);

      // ── PRIMARY METHOD: BREVO HTTP REST API (v3) ──
      const brevoApiKey = process.env.BREVO_API_KEY;
      if (brevoApiKey) {
        console.log(`📧 [${callId}] Attempting Method: BREVO_HTTP_API`);
        try {
          const senderEmail = process.env.EMAIL_USER || "hello@prophetbird.com";
          const senderName = branding.schoolName || "SchoolOS";

          console.log(`📧 [${callId}] Brevo request — sender: "${senderName}" <${senderEmail}>, to: ${to}`);

          const brevoRes = await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
              sender: { name: senderName, email: senderEmail },
              to: [{ email: to }],
              subject,
              htmlContent: html
            },
            {
              headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
                "accept": "application/json"
              },
              httpsAgent: ipv4Agent,
              timeout: 10000
            }
          );
          console.log(`✅ [${callId}] Email sent via Brevo HTTP API — messageId: ${brevoRes.data?.messageId || brevoRes.data?.id}, status: ${brevoRes.status}`);
          return brevoRes.data;
        } catch (brevoErr) {
          const brevoStatus = brevoErr.response?.status || "N/A";
          const brevoErrData = brevoErr.response?.data || {};
          const brevoErrMsg = brevoErrData.message || brevoErr.message;
          const brevoErrCode = brevoErrData.code || "unknown";
          console.error(`❌ [${callId}] BREVO HTTP API FAILED:`);
          console.error(`   Status: ${brevoStatus}`);
          console.error(`   Code: ${brevoErrCode}`);
          console.error(`   Message: ${brevoErrMsg}`);
          console.error(`   Full Error Data: ${JSON.stringify(brevoErrData)}`);

          if (brevoErrCode === "unauthorized" && brevoErrMsg.includes("unrecognised IP address")) {
            console.warn(`👉 [${callId}] Action needed: Authorize Railway's IP in Brevo Dashboard → https://app.brevo.com/security/authorised_ips`);
          }

          console.log(`📧 [${callId}] Falling back to Nodemailer SMTP...`);
        }
      } else {
        console.warn(`⚠️ [${callId}] BREVO_API_KEY not set — skipping Brevo, attempting SMTP fallback`);
      }

      // ── SECONDARY FALLBACK METHOD: NODEMAILER SMTP ──
      console.log(`📧 [${callId}] Attempting Method: NODEMAILER_SMTP`);
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"SchoolOS" <${process.env.EMAIL_USER || "hello@prophetbird.com"}>`,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [${callId}] Email sent via Fallback SMTP — messageId: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ [${callId}] ALL email methods FAILED for ${to}:`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack?.split("\n").slice(0, 3).join("\n")}`);
      throw error;
    }
  }

  normalizeBaseUrl(url) {
    let base = (url || process.env.FRONTEND_URL || "http://localhost:3000").trim();
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = `https://${base}`;
    }
    return base.replace(/\/+$/, "");
  }

  // ── Specific email helpers ──────────────────────────────────────────────

  async sendInvitation({ to, name, role, token, loginEmail, instituteId, frontendUrl }) {
    const baseUrl = this.normalizeBaseUrl(frontendUrl);
    const setPasswordUrl = `${baseUrl}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `You've been invited to SchoolOS — Set your password`,
      templateName: "invitation",
      templateData: { name, role, setPasswordUrl, loginEmail: loginEmail || to },
      instituteId
    });
  }

  async sendMasterAdminSetup({ to, name, token, instituteId, frontendUrl }) {
    const baseUrl = this.normalizeBaseUrl(frontendUrl);
    const setPasswordUrl = `${baseUrl}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `SchoolOS — Set your Master Admin password`,
      templateName: "master_admin_setup",
      templateData: { name, setPasswordUrl, loginEmail: to },
      instituteId
    });
  }

  async sendPasswordChangedConfirmation({ to, name, instituteId, frontendUrl }) {
    const baseUrl = this.normalizeBaseUrl(frontendUrl);
    const loginUrl = `${baseUrl}/auth/login`;
    return this.sendEmail({
      to,
      subject: "Your SchoolOS password has been set successfully",
      templateName: "password_changed",
      templateData: { name, loginUrl },
      instituteId
    });
  }

  async sendForgotPassword({ to, name, token, instituteId, frontendUrl }) {
    const baseUrl = this.normalizeBaseUrl(frontendUrl);
    const resetPasswordUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: "Reset your SchoolOS password",
      templateName: "forgot_password",
      templateData: { name, resetPasswordUrl },
      instituteId
    });
  }

  async sendDeactivationNotification({ to, name, instituteId }) {
    return this.sendEmail({
      to,
      subject: "Your SchoolOS account has been deactivated",
      templateName: "deactivation",
      templateData: { name },
      instituteId
    });
  }

  async sendStudentEnrollmentConfirmation({ to, guardianName, studentName, className, enrollmentDate, instituteId }) {
    // Attempt to load school profile to resolve dynamically in subject line if possible
    let schoolName = "our school";
    try {
      const schoolProfile = await SchoolProfileModel.getProfile(instituteId);
      if (schoolProfile?.school_name) schoolName = schoolProfile.school_name;
    } catch (e) {}

    return this.sendEmail({
      to,
      subject: `Enrollment Confirmation: ${studentName} at ${schoolName}`,
      templateName: "student_enrollment_confirmation",
      templateData: { guardianName, studentName, className, enrollmentDate },
      instituteId
    });
  }

  async sendStudentStatusUpdateNotification({ to, studentName, statusName, instituteId }) {
    return this.sendEmail({
      to,
      subject: `Status Update: ${studentName}'s account status has been updated`,
      templateName: "student_status_update",
      templateData: { studentName, statusName },
      instituteId
    });
  }
}

export const emailService = new EmailService();
