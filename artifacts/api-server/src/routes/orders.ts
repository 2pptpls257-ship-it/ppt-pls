import { Router, type IRouter } from "express";
import { CreateCheckoutBody, CreateCheckoutResponse, CreateOrderBody, CreateOrderResponse } from "@workspace/api-zod";
import { randomUUID } from "node:crypto";
import { getWhopClient, getWhopCompanyId } from "../lib/whopClient";

const router: IRouter = Router();

type StoredOrder = {
  id: string;
  email: string;
  subjectGroup: string;
  subject: string;
  slideRange: string;
  topic: string;
  instructions?: string;
  deliveryMode: "standard" | "personalized";
  currency?: "USD" | "INR" | "GEL";
  createdAt: string;
};

const orders = new Map<string, StoredOrder>();
const usdPrices: Record<string, Record<string, number>> = {
  "pre-clinical": { "10–15": 2.99, "15–25": 4.99, "25–30": 5.99 },
  "para-clinical": { "10–15": 3.99, "15–25": 5.99, "25–30": 6.99 },
  clinical: { "10–15": 4.99, "15–25": 6.99, "25–30": 7.99 },
};
const localPrices: Record<string, Record<string, number>> = {
  USD: usdPrices["clinical"],
  INR: { "10–15": 419, "15–25": 579, "25–30": 669 },
  GEL: { "10–15": 13.7, "15–25": 19.2, "25–30": 22 },
};

router.post("/orders", (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required brief fields." });
    return;
  }

  const input = parsed.data;
  const order: StoredOrder = {
    ...input,
    id: `PPT-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);

  res.status(201).json(
    CreateOrderResponse.parse({
      id: order.id,
      status: "brief_received",
      email: order.email,
      topic: order.topic,
      deliveryEta: "within 1 hour after payment and brief review",
      checkoutUrl: null,
    }),
  );
});

router.post("/checkout", async (req, res) => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid order reference and currency are required." });
    return;
  }

  const order = orders.get(parsed.data.orderId);
  if (!order) {
    res.status(404).json({ error: "That order could not be found." });
    return;
  }

  // Whop remains the source of truth for paid orders. A one-time hosted checkout
  // plan is created under the configured Whop company for each brief.
  try {
    const client = await getWhopClient();
    const companyId = process.env.WHOP_COMPANY_ID ?? (await getWhopCompanyId());
    const redirectUrl = `${req.protocol}://${req.get("host")}/success?order=${encodeURIComponent(order.id)}`;
    const currency = parsed.data.currency;
    const amount = currency === "USD"
      ? usdPrices[order.subjectGroup]?.[order.slideRange]
      : localPrices[currency]?.[order.slideRange];
    if (!amount) throw new Error("Could not calculate the selected price.");

    const checkout = await client.checkoutConfigurations.create({
      plan: {
        account_id: companyId,
        currency: currency.toLowerCase(),
        initial_price: amount,
        plan_type: "one_time",
        release_method: "buy_now",
        description: `Custom ${order.subject} presentation on ${order.topic}`,
        force_create_new_plan: true,
      },
      redirect_url: redirectUrl,
      mode: "payment",
    });
    if (!checkout.purchase_url) throw new Error("Whop did not return a hosted checkout URL.");

    res.status(201).json(CreateCheckoutResponse.parse({ purchaseUrl: checkout.purchase_url, orderId: order.id }));
  } catch (error) {
    req.log.error({ err: error, orderId: order.id }, "Could not create Whop checkout");
    res.status(503).json({ error: "Hosted checkout is temporarily unavailable." });
  }
});

export default router;