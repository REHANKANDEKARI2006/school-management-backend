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
   * Verify SMTP connection — call this on server startup.
   */
  async verify() {
    if (process.env.EMAIL_BRIDGE_URL) {
      console.log("ℹ️ Production Email Bridge configured. Bypassing local startup verification.");
      return true;
    }

    if (process.env.BREVO_API_KEY) {
      console.log("⚡ Primary Email Service: Brevo HTTP REST API (v3) configured.");
    }

    try {
      await this.transporter.verify();
      console.log("✅ Fallback Email Service (Nodemailer SMTP) verified.");
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

      // If EMAIL_BRIDGE_URL is set, send via HTTP POST request to Vercel
      if (process.env.EMAIL_BRIDGE_URL) {
        console.log(`✉️ Sending email to: ${to} via Vercel SMTP Bridge...`);
        const response = await axios.post(process.env.EMAIL_BRIDGE_URL, {
          to,
          subject,
          html,
          secret: process.env.EMAIL_BRIDGE_SECRET,
        }, { timeout: 5000 });
        if (response.data && response.data.success) {
          console.log(`✅ Email sent successfully via bridge: ${response.data.messageId}`);
          return response.data;
        } else {
          throw new Error(response.data?.error || "Unknown bridge failure");
        }
      }

      console.log(`✉️ Sending email to: ${to} (Subject: "${subject}", School: "${branding.schoolName}")`);

      // ── PRIMARY METHOD: BREVO HTTP REST API (v3) ──
      const brevoApiKey = process.env.BREVO_API_KEY;
      if (brevoApiKey) {
        try {
          const senderEmail = process.env.EMAIL_USER || "hello@prophetbird.com";
          const senderName = branding.schoolName || "SchoolOS";

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
              timeout: 2500
            }
          );
          console.log(`✅ Email sent successfully via Primary Brevo HTTP API: ${brevoRes.data?.messageId || brevoRes.data?.id}`);
          return brevoRes.data;
        } catch (brevoErr) {
          const brevoErrMsg = brevoErr.response?.data?.message || brevoErr.message;
          console.warn(`⚠️ Primary Brevo HTTP API error (${brevoErrMsg}). Falling back to Nodemailer SMTP...`);
          if (brevoErr.response?.data?.code === "unauthorized" && brevoErrMsg.includes("unrecognised IP address")) {
            console.warn(`👉 Action needed in Brevo Dashboard: Authorize IP at https://app.brevo.com/security/authorised_ips`);
          }
        }
      }

      // ── SECONDARY FALLBACK METHOD: NODEMAILER SMTP ──
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"SchoolOS" <${process.env.EMAIL_USER || "hello@prophetbird.com"}>`,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully via Fallback SMTP: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
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
