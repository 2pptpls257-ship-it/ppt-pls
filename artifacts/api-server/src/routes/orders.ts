import { Router, type IRouter } from "express";
import { CreateCheckoutBody, CreateCheckoutResponse, CreateOrderBody, CreateOrderResponse } from "@workspace/api-zod";
import { randomUUID } from "node:crypto";
import { sendOrderNotificationEmail } from "../lib/email";

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
  currency?: "USD" | "INR";
  createdAt: string;
};

const orders = new Map<string, StoredOrder>();
const staticCheckoutUrls: Record<string, Record<string, string>> = {
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
  void sendOrderNotificationEmail(order);

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

  const purchaseUrl = staticCheckoutUrls[parsed.data.currency]?.[order.slideRange];
  if (!purchaseUrl) {
    res.status(503).json({
      error: `Hosted checkout is not configured for ${parsed.data.currency} yet.`,
    });
    return;
  }

  res.status(201).json(CreateCheckoutResponse.parse({ purchaseUrl, orderId: order.id }));
});

export default router;