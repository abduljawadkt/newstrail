import crypto from "node:crypto";

/**
 * Easebuzz integration helper.
 *
 * Supports three EASEBUZZ_ENV values:
 *  - "test"  -> https://testpay.easebuzz.in
 *  - "prod"  -> https://pay.easebuzz.in
 *  - "mock"  -> no external call; the app simulates the gateway locally so the
 *               whole subscription flow can be demoed without real credentials.
 */

export type EasebuzzEnv = "test" | "prod" | "mock";

export function easebuzzEnv(): EasebuzzEnv {
  const v = (process.env.EASEBUZZ_ENV || "test").toLowerCase();
  if (v === "prod" || v === "mock") return v;
  return "test";
}

export function isMock() {
  return easebuzzEnv() === "mock";
}

export function easebuzzBaseUrl() {
  return easebuzzEnv() === "prod" ? "https://pay.easebuzz.in" : "https://testpay.easebuzz.in";
}

const UDF_KEYS = ["udf1", "udf2", "udf3", "udf4", "udf5", "udf6", "udf7", "udf8", "udf9", "udf10"] as const;

export type InitiateParams = {
  txnid: string;
  amount: string; // formatted "99.00"
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf?: Partial<Record<(typeof UDF_KEYS)[number], string>>;
};

function sha512(input: string) {
  return crypto.createHash("sha512").update(input).digest("hex");
}

/** Request hash: key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt */
export function requestHash(p: InitiateParams) {
  const key = process.env.EASEBUZZ_KEY || "";
  const salt = process.env.EASEBUZZ_SALT || "";
  const udf = UDF_KEYS.map((k) => p.udf?.[k] ?? "");
  const seq = [key, p.txnid, p.amount, p.productinfo, p.firstname, p.email, ...udf, salt];
  return sha512(seq.join("|"));
}

/** Reverse hash for verifying the gateway response. */
export function verifyResponseHash(body: Record<string, string>) {
  const key = process.env.EASEBUZZ_KEY || "";
  const salt = process.env.EASEBUZZ_SALT || "";
  const udfReversed = [...UDF_KEYS].reverse().map((k) => body[k] ?? "");
  const seq = [
    salt,
    body.status ?? "",
    ...udfReversed,
    body.email ?? "",
    body.firstname ?? "",
    body.productinfo ?? "",
    body.amount ?? "",
    body.txnid ?? "",
    key,
  ];
  const expected = sha512(seq.join("|"));
  return expected === (body.hash ?? "").toLowerCase();
}

/**
 * Calls Easebuzz "Initiate Payment" API and returns the hosted-checkout URL.
 * Throws with a readable message on failure.
 */
export async function initiatePayment(p: InitiateParams): Promise<string> {
  const key = process.env.EASEBUZZ_KEY || "";
  const hash = requestHash(p);

  const form = new URLSearchParams();
  form.set("key", key);
  form.set("txnid", p.txnid);
  form.set("amount", p.amount);
  form.set("productinfo", p.productinfo);
  form.set("firstname", p.firstname);
  form.set("email", p.email);
  form.set("phone", p.phone);
  form.set("surl", p.surl);
  form.set("furl", p.furl);
  form.set("hash", hash);
  for (const k of UDF_KEYS) form.set(k, p.udf?.[k] ?? "");

  const res = await fetch(`${easebuzzBaseUrl()}/payment/initiateLink`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString(),
  });

  const data = (await res.json()) as { status: number | boolean; data?: string; error_desc?: string };
  if (!data || (data.status !== 1 && data.status !== true) || !data.data) {
    throw new Error(data?.error_desc || "Easebuzz did not return an access key");
  }
  return `${easebuzzBaseUrl()}/pay/${data.data}`;
}
