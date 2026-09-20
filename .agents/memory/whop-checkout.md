---
name: Whop checkout connectivity
description: Current workspace behavior when the connected Whop proxy is unavailable during hosted checkout creation.
---

Hosted checkout must keep an explicit non-payment fallback because the connected Whop proxy can time out in development before returning account settings. A direct Whop Account API key avoids that connector, but it must include `checkout_configuration:create`.

**Why:** A checkout request that waits on a stalled connector makes a deadline-sensitive ordering flow feel broken; the customer brief should remain saved and the email fallback should appear quickly.

**How to apply:** Keep checkout errors explicit, keep the brief capture before payment, use a server-only API key for direct Whop calls, and avoid treating a redirect or client-side state as proof of payment.