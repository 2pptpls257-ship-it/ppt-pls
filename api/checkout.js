const staticCheckoutUrls = {
  USD: {
    "10–15": "https://whop.com/checkout/plan_Cn0EQqO3VHcnS",
    "15–25": "https://whop.com/checkout/plan_jcGSjuHp4SlBK",
    "25–30": "https://whop.com/checkout/plan_hvey2G1l6pvwA",
  },
  INR: {
    "10–15": "https://whop.com/checkout/plan_trrl1XCMtr9i3",
    "15–25": "https://whop.com/checkout/plan_uPADufWc9uw0E",
    "25–30": "https://whop.com/checkout/plan_UIswlqOW6Yl53",
  },
};

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

  const currency = data.currency || "USD";
  const slideRange = data.slideRange || "10–15";
  const purchaseUrl =
    staticCheckoutUrls[currency]?.[slideRange] ||
    staticCheckoutUrls.USD["10–15"];

  res.status(201).json({ purchaseUrl, orderId: data.orderId || "PPT-NEW" });
}
