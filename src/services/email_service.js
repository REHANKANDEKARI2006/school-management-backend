import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { SchoolProfileModel } from "../models/school_profile_model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Verify SMTP connection — call this on server startup.
   * Logs success or exact error so misconfiguration is immediately visible.
   */
  async verify() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service SMTP verified — ready to send emails.");
      return true;
    } catch (error) {
      console.error("❌ Email service SMTP verification FAILED:");
      console.error(`   Code    : ${error.code}`);
      console.error(`   Message : ${error.message}`);
      console.error(`   Host    : ${process.env.EMAIL_HOST}`);
      console.error(`   Port    : ${process.env.EMAIL_PORT}`);
      console.error(`   User    : ${process.env.EMAIL_USER}`);
      console.error("   → Check EMAIL_USER and EMAIL_PASS in .env (EMAIL_PASS must be a 16-char Gmail App Password)");
      return false;
    }
  }

  async sendEmail({ to, subject, templateName, templateData }) {
    let html = ""; // Declare outside try so catch block can reference it safely
    try {
      // Fetch school branding info
      const schoolProfile = await SchoolProfileModel.getProfile();
      const branding = {
        schoolName: schoolProfile?.school_name || "CampusConnect",
        logoUrl: schoolProfile?.logo_url || "https://res.cloudinary.com/dmrin51u8/image/upload/v1713550000/logo_placeholder.png",
        primaryColor: schoolProfile?.primary_color || "#3b82f6",
      };

      // Compile EJS template
      const templatePath = path.join(__dirname, `../templates/auth/${templateName}.ejs`);
      html = await ejs.renderFile(templatePath, { ...templateData, branding });

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"CampusConnect" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      };

      console.log(`📤 Sending email to: ${to} | Subject: ${subject}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending FAILED:");
      console.error(`   To      : ${to}`);
      console.error(`   Subject : ${subject}`);
      console.error(`   Code    : ${error.code}`);
      console.error(`   Message : ${error.message}`);
      if (error.code === "EAUTH") {
        console.error("   → SMTP AUTH error: EMAIL_PASS must be a Gmail App Password (not your regular password).");
        console.error("     Generate one at: Google Account → Security → 2-Step Verification → App Passwords");
      }
      // Fallback: dump email content to console so invites aren't silently lost
      console.log("📋 FALLBACK — Email content (copy link manually if needed):");
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      if (html && html.length > 0) {
        // Extract the set-password URL from html if present
        const urlMatch = html.match(/href="(http[^"]+)"/);
        if (urlMatch) console.log(`   Action URL: ${urlMatch[1]}`);
      }
      throw error;
    }
  }

  // ── Specific email helpers ──────────────────────────────────────────────

  async sendInvitation({ to, name, role, token, loginEmail }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const setPasswordUrl = `${frontendUrl}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `You've been invited to CampusConnect — Set your password`,
      templateName: "invitation",
      templateData: { name, role, setPasswordUrl, loginEmail: loginEmail || to },
    });
  }

  async sendPasswordChangedConfirmation({ to, name }) {
    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/`;
    return this.sendEmail({
      to,
      subject: "Your CampusConnect password has been set successfully",
      templateName: "password_changed",
      templateData: { name, loginUrl },
    });
  }

  async sendForgotPassword({ to, name, token }) {
    const resetPasswordUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: "Reset your CampusConnect password",
      templateName: "forgot_password",
      templateData: { name, resetPasswordUrl },
    });
  }

  async sendDeactivationNotification({ to, name }) {
    return this.sendEmail({
      to,
      subject: "Your CampusConnect account has been deactivated",
      templateName: "deactivation",
      templateData: { name },
    });
  }

  async sendStudentEnrollmentConfirmation({ to, guardianName, studentName, className, enrollmentDate }) {
    return this.sendEmail({
      to,
      subject: `Enrollment Confirmation: ${studentName} at ${this.schoolName || "our school"}`,
      templateName: "student_enrollment_confirmation",
      templateData: { guardianName, studentName, className, enrollmentDate },
    });
  }

  async sendStudentStatusUpdateNotification({ to, studentName, statusName }) {
    return this.sendEmail({
      to,
      subject: `Status Update: ${studentName}'s account status has been updated`,
      templateName: "student_status_update",
      templateData: { studentName, statusName },
    });
  }
}

export const emailService = new EmailService();
