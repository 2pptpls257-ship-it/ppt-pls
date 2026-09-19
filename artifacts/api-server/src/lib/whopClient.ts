import { WhopClient } from '@whop/sdk';

let clientPromise: Promise<WhopClient> | null = null;
let companyIdPromise: Promise<string> | null = null;

async function fetchWhopSettings(): Promise<{ companyId: string; apiKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Missing Replit environment variables. ' +
        'Ensure the Whop integration is connected via the Integrations tab.',
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=whop`,
    {
      headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken },
    signal: AbortSignal.timeout(3_000),
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Whop credentials: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { api_key?: string; company_id?: string } }>;
  };
  const settings = data.items?.[0]?.settings;

  if (!settings?.api_key || !settings.company_id) {
    throw new Error(
      'Whop integration not connected or missing credentials. ' +
        'Connect Whop via the Integrations tab first.',
    );
  }

  return { companyId: settings.company_id, apiKey: settings.api_key };
}

async function initWhopClient(): Promise<WhopClient> {
  const settings = await fetchWhopSettings();
  return new WhopClient({ token: settings.apiKey });
}

export function getWhopClient(): Promise<WhopClient> {
  if (!clientPromise) {
    clientPromise = initWhopClient().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }

  return clientPromise;
}

export function getWhopCompanyId(): Promise<string> {
  if (!companyIdPromise) {
    companyIdPromise = fetchWhopSettings()
      .then(({ companyId }) => companyId)
      .catch((err) => {
        companyIdPromise = null;
        throw err;
      });
  }
  return companyIdPromise;
}
