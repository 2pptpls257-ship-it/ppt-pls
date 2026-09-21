import nodemailer from "nodemailer";
import { logger } from "./logger";

export type OrderEmailDetails = {
  id: string;
  email: string;
  subjectGroup: string;
  subject: string;
  slideRange: string;
  topic: string;
  instructions?: string;
  deliveryMode: "standard" | "personalized";
  currency?: "USD" | "INR";
  createdAt: string;
};

const TARGET_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || "2pptpls257@gmail.com";

export async function sendOrderNotificationEmail(order: OrderEmailDetails): Promise<boolean> {
  const subject = `PPT Request — ${order.topic} — ${order.id}`;
  const textBody = [
    "Hello PPT pls,",
    "",
    "A new presentation order has been submitted.",
    "",
    `Order ID: ${order.id}`,
    `Category: ${order.subjectGroup}`,
    `Subject: ${order.subject}`,
    `Topic: ${order.topic}`,
    `Number of slides: ${order.slideRange}`,
    `Delivery preference: ${order.deliveryMode}`,
    `Currency: ${order.currency || "USD"}`,
    `Customer email: ${order.email}`,
    "",
    "Requirements / source material:",
    order.instructions?.trim() || "None provided",
    "",
    `Created at: ${order.createdAt}`,
  ].join("\n");

  // 1. If SMTP environment variables are configured, use nodemailer
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : true),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"PPT pls Orders" <${process.env.SMTP_USER}>`,
        to: TARGET_EMAIL,
        replyTo: order.email,
        subject,
        text: textBody,
      });

      logger.info({ orderId: order.id, to: TARGET_EMAIL }, "Order notification sent via SMTP");
      return true;
    } catch (err) {
      logger.error({ err, orderId: order.id }, "Failed to send email via SMTP, attempting fallback");
    }
  }

  // 2. Automated HTTP email forwarding fallback (FormSubmit)
  try {
    const resp = await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _replyto: order.email,
        "Order ID": order.id,
        "Category": order.subjectGroup,
        "Subject": order.subject,
        "Topic": order.topic,
        "Number of slides": order.slideRange,
        "Delivery preference": order.deliveryMode,
        "Currency": order.currency || "USD",
        "Customer email": order.email,
        "Requirements": order.instructions?.trim() || "None provided",
        "Created At": order.createdAt,
      }),
    });

    if (resp.ok) {
      logger.info({ orderId: order.id, to: TARGET_EMAIL }, "Order notification email dispatched to " + TARGET_EMAIL);
      return true;
    } else {
      const errText = await resp.text();
      logger.warn({ status: resp.status, errText, orderId: order.id }, "FormSubmit returned non-200 response");
    }
  } catch (err) {
    logger.error({ err, orderId: order.id }, "Error dispatching order notification via FormSubmit");
  }

  logger.info({ orderId: order.id, subject, textBody }, "Order details logged in server");
  return false;
}
