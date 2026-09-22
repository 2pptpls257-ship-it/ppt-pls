import { randomUUID } from "node:crypto";

const TARGET_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || "2pptpls257@gmail.com";

async function sendEmail(order) {
  const subject = `PPT Request — ${order.topic} — ${order.id}`;
  const textBody = [
    "Hello PPT pls,",
    "",
    "A new presentation order has been submitted.",
    "",
    `Order ID: ${order.id}`,
    `Category: ${order.subjectGroup || "Not specified"}`,
    `Subject: ${order.subject || "Not specified"}`,
    `Topic: ${order.topic || "Not specified"}`,
    `Number of slides: ${order.slideRange || "Not specified"}`,
    `Delivery preference: ${order.deliveryMode || "standard"}`,
    `Currency: ${order.currency || "USD"}`,
    `Customer email: ${order.email}`,
    "",
    "Requirements / source material:",
    order.instructions?.trim() || "None provided",
    "",
    `Created at: ${order.createdAt}`,
  ].join("\n");

  // 1. SMTP if environment variables configured in Vercel
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : true,
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
      console.log(`[SMTP] Order email dispatched to ${TARGET_EMAIL} for order ${order.id}`);
      return true;
    } catch (err) {
      console.error("[SMTP] Send failed, falling back to FormSubmit:", err);
    }
  }

  // 2. Automated HTTP forwarding fallback (FormSubmit)
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
        "Category": order.subjectGroup || "General",
        "Subject": order.subject || "General",
        "Topic": order.topic || "General",
        "Number of slides": order.slideRange || "10-15",
        "Delivery preference": order.deliveryMode || "standard",
        "Currency": order.currency || "USD",
        "Customer email": order.email,
        "Requirements": order.instructions?.trim() || "None provided",
        "Created At": order.createdAt,
      }),
    });
    if (resp.ok) {
      console.log(`[FormSubmit] Order notification dispatched to ${TARGET_EMAIL}`);
      return true;
    }
  } catch (err) {
    console.error("[FormSubmit] Send failed:", err);
  }

  return false;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Handle parsed body or parse from buffer/string if needed
  let data = req.body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  } else if (!data) {
    data = {};
  }

  if (!data.email || !data.topic) {
    res.status(400).json({ error: "Please complete the required brief fields." });
    return;
  }

  const order = {
    ...data,
    id: `PPT-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  await sendEmail(order);

  res.status(201).json({
    id: order.id,
    status: "brief_received",
    email: order.email,
    topic: order.topic,
    deliveryEta: "within 1 hour after payment and brief review",
    checkoutUrl: null,
  });
}
