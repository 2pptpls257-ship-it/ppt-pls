export default async function handler(req, res) {
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

  const diagnostics = {
    targetEmail,
    detectedSmtpUser: smtpUser || null,
    hasSmtpPass: Boolean(smtpPass),
    passLength: smtpPass ? smtpPass.length : 0,
    allEnvKeysWithMailOrSmtp: Object.keys(process.env).filter(
      (k) =>
        k.toUpperCase().includes("SMTP") ||
        k.toUpperCase().includes("MAIL") ||
        k.toUpperCase().includes("GMAIL") ||
        k.toUpperCase().includes("PASS") ||
        k.toUpperCase().includes("USER"),
    ),
    smtpAttempt: null,
    formSubmitAttempt: null,
  };

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

      const info = await transporter.sendMail({
        from: `"PPT pls Diagnostic" <${user}>`,
        to: targetEmail,
        subject: "PPT pls Diagnostic Test Email",
        text: "This is a diagnostic email from your Vercel deployment.",
      });
      diagnostics.smtpAttempt = { success: true, messageId: info.messageId };
    } catch (err) {
      diagnostics.smtpAttempt = {
        success: false,
        error: err.message,
        code: err.code,
        response: err.response,
      };
    }
  }

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
        _subject: "PPT pls FormSubmit Diagnostic",
        message: "Diagnostic check for FormSubmit delivery",
      }),
    });
    const json = await resp.json().catch(() => ({}));
    diagnostics.formSubmitAttempt = { status: resp.status, body: json };
  } catch (err) {
    diagnostics.formSubmitAttempt = { error: err.message };
  }

  res.status(200).json(diagnostics);
}
