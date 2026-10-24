import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  getRegistrationOtpEmailTemplate,
  getForgotPasswordOtpEmailTemplate,
} from "./templates/otp-email.template";
import {
  getContactAcknowledgementEmailTemplate,
  getContactReplyEmailTemplate,
} from "./templates/contact-email.template";
import { getNewsletterWelcomeEmailTemplate } from "./templates/newsletter-email.template";
import { getBulkOrderAcknowledgementEmailTemplate } from "./templates/bulk-order-email.template";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmtpVerifyResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  pass: string;
  from: string;
}

// Module-level cached transporter to prevent socket connection churn
let cachedTransporter: Transporter | null = null;
let cachedConfigKey = "";

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeSubject(subject: string): string {
  // Prevent SMTP header injection by removing CRLF characters
  return subject.replace(/[\r\n]+/g, " ").trim();
}

export const emailService = {
  /**
   * Resolves the SMTP configuration from environment variables.
   * Supports both standard SMTP_* names and existing EMAIL_* project variables.
   */
  getSmtpConfig(): SmtpConfig {
    const host =
      process.env.SMTP_HOST ||
      process.env.EMAIL_HOST ||
      "smtp.hostinger.com";

    const portStr =
      process.env.SMTP_PORT ||
      process.env.EMAIL_PORT ||
      "465";

    const user =
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      "info@rithanyafoods.com";

    const pass =
      process.env.SMTP_PASS ||
      process.env.EMAIL_PASS ||
      "";

    const rawFrom =
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      `"Rithu Snacks" <${user}>`;

    const port = Number(portStr) || 465;
    // Port 465 is implicit SSL/TLS; Port 587 uses STARTTLS
    const secure = port === 465;
    const requireTLS = port === 587;

    const from = rawFrom.includes("<")
      ? rawFrom
      : `"Rithu Snacks" <${rawFrom}>`;

    return {
      host,
      port,
      secure,
      requireTLS,
      user,
      pass,
      from,
    };
  },

  /**
   * Checks whether SMTP credentials are adequately configured.
   */
  isConfigured(): boolean {
    const config = this.getSmtpConfig();
    return Boolean(
      config.host &&
      config.user &&
      config.pass &&
      !config.host.includes("your-") &&
      !config.user.includes("your-") &&
      !config.pass.includes("your-")
    );
  },

  /**
   * Returns the canonical sender address formatted with display name.
   */
  getFromAddress(): string {
    return this.getSmtpConfig().from;
  },

  /**
   * Returns the raw sender email without display name.
   */
  getRawFromEmail(): string {
    const { from, user } = this.getSmtpConfig();
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : user;
  },

  /**
   * Returns a reusable (cached) Nodemailer transporter instance.
   * Recreates the transporter only when environment configuration changes.
   */
  getTransporter(): Transporter | null {
    if (!this.isConfigured()) {
      return null;
    }

    const config = this.getSmtpConfig();
    const configKey = `${config.host}:${config.port}:${config.user}:${config.secure}:${config.requireTLS}`;

    if (cachedTransporter && cachedConfigKey === configKey) {
      return cachedTransporter;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: config.requireTLS,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
      });

      cachedTransporter = transporter;
      cachedConfigKey = configKey;
      return cachedTransporter;
    } catch (error) {
      console.error("[EMAIL SERVICE] Failed to initialize SMTP transporter:", error);
      return null;
    }
  },

  /**
   * Verifies the SMTP connection and authentication credentials against Hostinger SMTP.
   * Useful for diagnostics, health checks, and initial setup testing.
   */
  async verifyConnection(): Promise<SmtpVerifyResult> {
    const config = this.getSmtpConfig();

    if (!this.isConfigured()) {
      const missing = [];
      if (!config.host) missing.push("SMTP_HOST / EMAIL_HOST");
      if (!config.user) missing.push("SMTP_USER / EMAIL_USER");
      if (!config.pass) missing.push("SMTP_PASS / EMAIL_PASS");
      return {
        success: false,
        message: `SMTP is not configured. Missing required variables: ${missing.join(", ")}`,
      };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        success: false,
        message: "Failed to initialize SMTP transporter.",
      };
    }

    try {
      await transporter.verify();
      return {
        success: true,
        message: `SMTP connection and authentication verified successfully with ${config.host}:${config.port} as ${config.user}`,
      };
    } catch (error: any) {
      const sanitizedMessage = error?.message || "Unknown SMTP error";
      console.error("[EMAIL SERVICE] SMTP connection verification failed:", sanitizedMessage);
      return {
        success: false,
        message: `SMTP connection failed: ${sanitizedMessage}`,
        error: sanitizedMessage,
      };
    }
  },

  /**
   * Generic, reusable email sending method.
   * Enforces sanitization, generates plain-text alternatives, and handles errors safely.
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { to, subject, html, text, from, replyTo, cc, bcc } = options;

    if (!to || (Array.isArray(to) && to.length === 0)) {
      console.warn("[EMAIL SERVICE] Attempted to send email without recipient.");
      return { success: false, error: "Recipient address is required" };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn(
        `[EMAIL SERVICE] SMTP not configured. Email to "${Array.isArray(to) ? to.join(", ") : to}" not sent. Subject: "${subject}"`
      );
      return {
        success: false,
        error: "SMTP service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
      };
    }

    const sender = from || this.getFromAddress();
    const cleanSubject = sanitizeSubject(subject);
    const plainText = text || stripHtmlToText(html);

    try {
      const info = await transporter.sendMail({
        from: sender,
        to,
        subject: cleanSubject,
        html,
        text: plainText,
        ...(replyTo ? { replyTo } : {}),
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
      });

      const recipientStr = Array.isArray(to) ? to.join(", ") : to;
      console.log(
        `[EMAIL SERVICE] Email successfully sent to ${recipientStr} (Subject: "${cleanSubject}", MessageId: ${info.messageId})`
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      const recipientStr = Array.isArray(to) ? to.join(", ") : to;
      const sanitizedMsg = error?.message || "Unknown error";
      console.error(
        `[EMAIL SERVICE] Failed to send email to ${recipientStr} (Subject: "${cleanSubject}"):`,
        sanitizedMsg
      );
      return {
        success: false,
        error: sanitizedMsg,
      };
    }
  },

  // -----------------------------------------------------------------
  // BUSINESS WORKFLOWS
  // -----------------------------------------------------------------

  /**
   * Sends registration or password-reset OTP email.
   */
  async sendOtpEmail(
    to: string,
    otp: string,
    purpose: "register" | "reset_password" = "register"
  ): Promise<boolean> {
    const { subject, html, text } =
      purpose === "register"
        ? getRegistrationOtpEmailTemplate(otp)
        : getForgotPasswordOtpEmailTemplate(otp);

    const result = await this.sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result.success;
  },

  /**
   * Sends auto-acknowledgement email to a user who submitted the contact form.
   */
  async sendContactAcknowledgementEmail(
    to: string,
    name: string,
    contactSubject?: string | null
  ): Promise<boolean> {
    const { subject, html, text } = getContactAcknowledgementEmailTemplate({
      name,
      subject: contactSubject,
    });

    const result = await this.sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result.success;
  },

  /**
   * Sends admin's reply message to a contact enquiry back to the customer.
   */
  async sendContactReplyEmail(
    to: string,
    name: string,
    originalSubject: string | null | undefined,
    replyMessage: string
  ): Promise<boolean> {
    const { subject, html, text } = getContactReplyEmailTemplate({
      name,
      originalSubject,
      replyMessage,
    });

    const result = await this.sendEmail({
      to,
      subject,
      html,
      text,
    });

    return result.success;
  },

  /**
   * Sends welcome email to a new newsletter subscriber.
   */
  async sendNewsletterWelcomeEmail(to: string): Promise<boolean> {
    const { subject, html, text } = getNewsletterWelcomeEmailTemplate({
      email: to,
    });

    const result = await this.sendEmail({
      to,
      subject,
      html,
      text,
      replyTo: this.getRawFromEmail(),
    });

    return result.success;
  },

  /**
   * Sends auto-acknowledgement email to a customer who submitted a bulk order enquiry.
   */
  async sendBulkOrderAcknowledgementEmail(params: {
    to: string;
    name: string;
    phone: string;
    quantity: number;
    productInterest?: string | null;
    companyName?: string | null;
    message?: string | null;
  }): Promise<boolean> {
    const { subject, html, text } = getBulkOrderAcknowledgementEmailTemplate(params);

    const result = await this.sendEmail({
      to: params.to,
      subject,
      html,
      text,
      replyTo: this.getRawFromEmail(),
    });

    return result.success;
  },
};

export default emailService;
