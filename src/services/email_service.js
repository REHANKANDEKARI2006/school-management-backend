import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
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
   */
  async verify() {
    if (process.env.RESEND_API_KEY) {
      console.log("✅ Email service: RESEND_API_KEY is configured. Using Resend REST API.");
      return true;
    }
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

  async sendEmail({ to, subject, templateName, templateData, instituteId }) {
    let html = "";
    try {
      // Fetch school branding info (falls back to Sunshine Public School ID 3 instead of ID 1)
      const schoolProfile = await SchoolProfileModel.getProfile(instituteId || 3);
      const branding = {
        schoolName: schoolProfile?.school_name || "CampusConnect",
        logoUrl: schoolProfile?.logo_url || "https://res.cloudinary.com/dmrin51u8/image/upload/v1713550000/logo_placeholder.png",
        primaryColor: schoolProfile?.primary_color || "#3b82f6",
      };

      // Compile EJS template
      const templatePath = path.join(__dirname, `../templates/auth/${templateName}.ejs`);
      html = await ejs.renderFile(templatePath, { ...templateData, branding });

      if (process.env.RESEND_API_KEY) {
        console.log(`✉️ Sending email to: ${to} (Subject: "${subject}", School: "${branding.schoolName}") via Resend API`);
        const fromAddress = process.env.RESEND_FROM || "onboarding@resend.dev";
        const response = await axios.post(
          "https://api.resend.com/emails",
          {
            from: fromAddress,
            to: [to],
            subject,
            html,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(`✅ Email sent successfully via Resend: ${response.data.id}`);
        return { messageId: response.data.id };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"CampusConnect" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      };

      console.log(`✉️ Sending email to: ${to} (Subject: "${subject}", School: "${branding.schoolName}")`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`❌ Failed to send email to ${to}:`, errMsg);
      throw error;
    }
  }

  // ── Specific email helpers ──────────────────────────────────────────────

  async sendInvitation({ to, name, role, token, loginEmail, instituteId }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const setPasswordUrl = `${frontendUrl}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `You've been invited to CampusConnect — Set your password`,
      templateName: "invitation",
      templateData: { name, role, setPasswordUrl, loginEmail: loginEmail || to },
      instituteId
    });
  }

  async sendMasterAdminSetup({ to, name, token, instituteId }) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const setPasswordUrl = `${frontendUrl}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `CampusConnect — Set your Master Admin password`,
      templateName: "master_admin_setup",
      templateData: { name, setPasswordUrl, loginEmail: to },
      instituteId
    });
  }

  async sendPasswordChangedConfirmation({ to, name, instituteId }) {
    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login`;
    return this.sendEmail({
      to,
      subject: "Your CampusConnect password has been set successfully",
      templateName: "password_changed",
      templateData: { name, loginUrl },
      instituteId
    });
  }

  async sendForgotPassword({ to, name, token, instituteId }) {
    const resetPasswordUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: "Reset your CampusConnect password",
      templateName: "forgot_password",
      templateData: { name, resetPasswordUrl },
      instituteId
    });
  }

  async sendDeactivationNotification({ to, name, instituteId }) {
    return this.sendEmail({
      to,
      subject: "Your CampusConnect account has been deactivated",
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
