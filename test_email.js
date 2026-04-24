import dotenv from "dotenv";
dotenv.config();
import { emailService } from "./src/services/email_service.js";

async function test() {
    try {
        console.log("🚀 Testing Email Service...");
        console.log("Config:", {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? "****" : "MISSING",
            from: process.env.EMAIL_FROM
        });

        const result = await emailService.sendInvitation({
            to: "guildn56@gmail.com",
            name: "Test User",
            role: "ADMIN",
            token: "test-token-123"
        });
        console.log("✅ Success:", result);
    } catch (err) {
        console.error("❌ Failed:", err);
    } finally {
        process.exit();
    }
}

test();
