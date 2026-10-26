import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.hostinger.com";
const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
const user = process.env.SMTP_USER || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const mailFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM || `"Rithu Snacks" <${user}>`;

const sendArg = process.argv.find((arg) => arg.startsWith("--send="));
const recipientEmail = sendArg ? sendArg.split("=")[1].trim() : null;

console.log("==================================================");
console.log(" 📧 Hostinger SMTP Diagnostic & Verification Tool ");
console.log("==================================================");
console.log(`• SMTP Host : ${host}`);
console.log(`• SMTP Port : ${port} (${port === 465 ? "SSL/TLS implicit" : "STARTTLS"})`);
console.log(`• SMTP User : ${user || "(MISSING)"}`);
console.log(`• Password  : ${pass ? "******** (" + pass.length + " chars)" : "(MISSING)"}`);
console.log(`• Mail From : ${mailFrom}`);
console.log("--------------------------------------------------");

if (!user || !pass) {
  console.error("❌ ERROR: Missing SMTP_USER or SMTP_PASS in .env file.");
  process.exit(1);
}

const secure = port === 465;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  requireTLS: port === 587,
  auth: {
    user,
    pass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

async function main() {
  try {
    console.log("⏳ Verifying Hostinger SMTP connection and credentials...");
    await transporter.verify();
    console.log("✅ SUCCESS: Hostinger SMTP connection and authentication verified!");

    if (recipientEmail) {
      console.log(`\n⏳ Sending test email to ${recipientEmail}...`);
      const info = await transporter.sendMail({
        from: mailFrom,
        to: recipientEmail,
        subject: "Rithu Snacks - Hostinger SMTP Test Email",
        text: `Hello!\n\nThis is a test email sent from Rithu Snacks using Hostinger SMTP (${host}:${port}).\nTimestamp: ${new Date().toISOString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #b45309; margin-top: 0;">Rithu Snacks &copy;</h2>
            <p>Hello,</p>
            <p>This is a confirmation test email verifying that <strong>Hostinger Business Email SMTP</strong> is working seamlessly for <strong>Rithu Snacks</strong>.</p>
            <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0; font-size: 14px;">
              <strong>Configuration:</strong><br/>
              • Host: ${host}<br/>
              • Port: ${port}<br/>
              • Sender: ${user}<br/>
              • Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you received this message, your SMTP configuration is fully ready for production emails (OTP, Contact replies, Order notifications, etc.).</p>
          </div>
        `,
      });

      console.log(`✅ Test email delivered successfully!`);
      console.log(`• Message ID: ${info.messageId}`);
      console.log(`• Accepted  : ${info.accepted?.join(", ") || recipientEmail}`);
    } else {
      console.log("\n💡 Tip: To send an actual test email, run:");
      console.log("   npm run email:test -- --send=your-email@example.com");
    }
  } catch (error) {
    console.error("❌ SMTP Verification Failed:");
    console.error(error.message);
    if (error.code) console.error(`• Code: ${error.code}`);
    if (error.response) console.error(`• Response: ${error.response}`);
    process.exit(1);
  }
}

main();
