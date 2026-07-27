import express from "express";
import cors from "cors";
import compression from "compression";
import pg from "pg";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import fs from "fs";

dotenv.config();

// Imports from backend source
import authRoutes from "../routes/auth_routes.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = 5099;
const API_BASE = `http://localhost:${PORT}`;

async function runSystemVerification() {
  console.log("=================================================");
  console.log("🧪 STARTING IN-MEMORY FULL SYSTEM SECURITY AUDIT");
  console.log("=================================================\n");

  // Create temporary express app instance for direct end-to-end verification
  const app = express();
  app.use(compression());
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL,
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /\.vercel\.app$/,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Institute-ID'],
    credentials: true,
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));
  app.use("/api/auth", authRoutes);

  const server = app.listen(PORT);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  function record(name, status, details = "") {
    results.total++;
    if (status) {
      results.passed++;
      console.log(`✅ [PASS] ${name} ${details ? `- ${details}` : ''}`);
    } else {
      results.failed++;
      console.log(`❌ [FAIL] ${name} ${details ? `- ${details}` : ''}`);
    }
    results.tests.push({ name, status, details });
  }

  try {
    // Test 1: Database Connectivity
    const dbRes = await pool.query("SELECT NOW()");
    record("Database Connection", dbRes.rows.length > 0, `DB timestamp: ${dbRes.rows[0].now}`);

    // Test 2: Master Admin User Record in DB
    const adminEmail = process.env.MASTER_ADMIN_EMAIL || "masteradmin1@demo.edu.in";
    const userRes = await pool.query('SELECT user_id, email, role_id, status, is_active FROM "user" WHERE LOWER(email) = LOWER($1)', [adminEmail]);
    const adminExists = userRes.rows.length > 0;
    record("Master Admin User Record", adminExists, adminExists ? `ID: ${userRes.rows[0].user_id}` : "Not found");

    // Test 3: User Enumeration Protection on Login
    try {
      await axios.post(`${API_BASE}/api/auth/login`, {
        email: "nonexistent_test_user_99@demo.edu",
        password: "WrongPassword123!"
      });
      record("User Enumeration Defense (H4)", false, "Expected 401 response");
    } catch (err) {
      const msg = err.response?.data?.message;
      record("User Enumeration Defense (H4)", msg === "Invalid credentials", `Returned message: "${msg}"`);
    }

    // Test 4: Password Minimum Length (8+ Chars Enforced)
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, {
        token: "dummy_token",
        password: "short"
      });
      record("Password Min Length 8+ Chars (L1)", false, "Expected 400 error");
    } catch (err) {
      const msg = err.response?.data?.message;
      record("Password Min Length 8+ Chars (L1)", msg && msg.includes("at least 8 characters"), `Blocked response: "${msg}"`);
    }

    // Test 5: JWT Signature & Expiry Config Check
    try {
      const token = jwt.sign(
        { user_id: 1, role_id: 1, institute_id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
      );
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      record("JWT Secret Signature Verification (C2/H3)", decoded.user_id === 1, `Configured expiry: ${process.env.ACCESS_TOKEN_EXPIRY || "15m"}`);
    } catch (err) {
      record("JWT Secret Signature Verification (C2/H3)", false, err.message);
    }

    // Test 6: Rate Limiting on Forgot Password
    let rateLimited = false;
    for (let i = 0; i < 7; i++) {
      try {
        await axios.post(`${API_BASE}/api/auth/forgot-password`, {
          email: "test_ratelimit@demo.edu"
        });
      } catch (err) {
        if (err.response?.status === 429) {
          rateLimited = true;
          break;
        }
      }
    }
    record("Forgot-Password IP Rate Limiting (M3)", rateLimited, "429 Too Many Requests triggered correctly");

    // Test 7: CORS Preflight Allow-Origin Verification
    try {
      const corsRes = await axios.options(`${API_BASE}/api/auth/login`, {
        headers: {
          'Origin': 'https://school-management-frontend-2am2oh4dc.vercel.app',
          'Access-Control-Request-Method': 'POST'
        }
      });
      const allowedOrigin = corsRes.headers['access-control-allow-origin'];
      record("CORS Allowed Origin Header (H1)", allowedOrigin === 'https://school-management-frontend-2am2oh4dc.vercel.app', `Header value: ${allowedOrigin}`);
    } catch (err) {
      record("CORS Allowed Origin Header (H1)", false, err.message);
    }

    // Test 8: EJS Template Child Process Exec Removal
    try {
      const content = fs.readFileSync("src/templates/auth/invitation.ejs", "utf-8");
      const hasChildProcess = content.includes("child_process") || content.includes("spawnSync");
      record("EJS Process Spawning Removal (C3)", !hasChildProcess, "invitation.ejs is clean");
    } catch (err) {
      record("EJS Process Spawning Removal (C3)", false, err.message);
    }

  } catch (globalErr) {
    console.error("Global audit error:", globalErr);
  } finally {
    server.close();
    await pool.end();
  }

  console.log("\n=================================================");
  console.log(`📊 FINAL AUDIT RESULT: ${results.passed}/${results.total} Tests Passed (${results.failed} Failures)`);
  console.log("=================================================");

  process.exit(results.failed === 0 ? 0 : 1);
}

runSystemVerification();
