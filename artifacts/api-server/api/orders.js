import { randomUUID } from "node:crypto";

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

  const smtpUser =
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    process.env.MAIL_USER ||
    process.env.MAIL_USERNAME ||
    process.env.EMAIL;

  const smtpPass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.MAIL_PASS ||
    process.env.MAIL_PASSWORD ||
    process.env.APP_PASSWORD;

  const targetEmail =
    process.env.ORDER_NOTIFICATION_EMAIL ||
    smtpUser ||
    "2pptpls257@gmail.com";

  // 1. SMTP if password configured in Vercel environment variables
  if (smtpPass) {
    const user = smtpUser || "2pptpls257@gmail.com";
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user,
          pass: smtpPass.replace(/\s+/g, ""),
        },
      });

      await transporter.sendMail({
        from: `"PPT pls Orders" <${user}>`,
        to: targetEmail,
        replyTo: order.email,
        subject,
        text: textBody,
      });
      console.log(`[SMTP] Order email dispatched to ${targetEmail} for order ${order.id}`);
      return { success: true, method: "smtp" };
    } catch (err) {
      console.error("[SMTP] Send failed, trying FormSubmit:", err?.message || err);
    }
  }

  // 2. Automated HTTP forwarding fallback (FormSubmit)
  try {
    const resp = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://ppt-pls-api-server.vercel.app",
        Referer: "https://ppt-pls-api-server.vercel.app/",
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
    const resJson = await resp.json().catch(() => ({}));
    console.log(`[FormSubmit] response:`, resJson);
    if (resJson.success === "true" || resp.ok) {
      return { success: true, method: "formsubmit" };
    }
  } catch (err) {
    console.error("[FormSubmit] Send failed:", err);
  }

  return { success: false };
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

  const emailResult = await sendEmail(order);

  res.status(201).json({
    id: order.id,
    status: "brief_received",
    email: order.email,
    topic: order.topic,
    deliveryEta: "within 1 hour after payment and brief review",
    checkoutUrl: null,
    emailDispatched: emailResult.success,
  });
}
