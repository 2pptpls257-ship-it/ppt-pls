import { WhopClient } from '@whop/sdk';

let clientPromise: Promise<WhopClient> | null = null;

async function initWhopClient(): Promise<WhopClient> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error('Missing WHOP_API_KEY. Add the Whop Account API key as a Replit Secret.');
  }
  return new WhopClient({ token: apiKey });
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
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) {
    return Promise.reject(new Error('Missing WHOP_COMPANY_ID.'));
  }
  return Promise.resolve(companyId);
}
