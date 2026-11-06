// Bakong Open API client. Only called when the customer clicks
// "check payment": there is no polling and Bakong has no webhook.
import { getKhqrConfig } from "./config";

export type BakongTransaction = {
  hash: string;
  fromAccountId: string;
  toAccountId: string;
  currency: string;
  amount: number;
  description?: string;
  createdDateMs?: number;
  acknowledgedDateMs?: number;
};

export type BakongCheck =
  | { paid: true; transaction: BakongTransaction }
  | { paid: false };

// Thrown when Bakong can't answer (token, network, outage); never means "unpaid"
export class BakongUnavailableError extends Error {}

type Envelope = {
  responseCode: number;
  responseMessage?: string;
  errorCode?: number | null;
  data?: BakongTransaction | null;
};

const HTTP_REASONS: Record<number, string> = {
  401: "Bakong token is invalid or expired; renew it",
  403: "Bakong rejected this server (reported to allow Cambodian IPs only)",
  429: "Bakong rate limit reached",
};

export async function checkTransactionByMd5(md5: string): Promise<BakongCheck> {
  const { apiUrl, token } = getKhqrConfig();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/check_transaction_by_md5`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ md5 }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    throw new BakongUnavailableError(`Bakong request failed: ${(error as Error).name}`);
  }

  if (response.status in HTTP_REASONS || response.status >= 500) {
    throw new BakongUnavailableError(
      HTTP_REASONS[response.status] ?? `Bakong returned HTTP ${response.status}`,
    );
  }

  // "Not paid yet" comes back as a JSON body, sometimes on a 400/404 status
  const body = (await response.json().catch(() => null)) as Envelope | null;
  if (!body || typeof body.responseCode !== "number") {
    throw new BakongUnavailableError(`Bakong returned HTTP ${response.status} without a result`);
  }

  if (body.responseCode === 0 && body.data && typeof body.data.hash === "string") {
    return { paid: true, transaction: body.data };
  }
  return { paid: false }; // errorCode 1: not found (unpaid), 3: failed
}
