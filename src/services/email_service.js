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
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendEmail({ to, subject, templateName, templateData }) {
    try {
      // Fetch school branding info
      const schoolProfile = await SchoolProfileModel.getProfile();
      const branding = {
        schoolName: schoolProfile?.school_name || "CampusConnect",
        logoUrl: schoolProfile?.logo_url || "https://res.cloudinary.com/dmrin51u8/image/upload/v1713550000/logo_placeholder.png",
        primaryColor: schoolProfile?.primary_color || "#3b82f6",
      };

      // Compile template
      const templatePath = path.join(__dirname, `../templates/auth/${templateName}.ejs`);
      const html = await ejs.renderFile(templatePath, { ...templateData, branding });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✉️ Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      console.log("🛠️ FALLBACK: Printing email content to console for testing:");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML: ${html.substring(0, 500)}...`);
      throw error;
    }
  }

  // Specific helpers
  async sendInvitation({ to, name, role, token }) {
    const setPasswordUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/set-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: `You have been invited to CampusConnect — ${name}`,
      templateName: "invitation",
      templateData: { name, role, setPasswordUrl },
    });
  }

  async sendPasswordChangedConfirmation({ to, name }) {
    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/login`;
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
}

export const emailService = new EmailService();
