/*
  Simple test script to hit GET /transactions on the Payments API.
  Usage:
    PAYMENTS_API=https://... PAYMENTS_API_KEY=xxxx npm run test:api
  or
    VITE_API_URL=https://... VITE_API_KEY=xxxx npm run test:api
*/

const BASE =
  process.env.PAYMENTS_API ||
  process.env.VITE_API_URL ||
  "https://o7h8qusgd9.execute-api.us-east-1.amazonaws.com/prod";
const API_KEY = process.env.PAYMENTS_API_KEY || process.env.VITE_API_KEY || "";

async function main() {
  if (typeof fetch !== "function") {
    console.error("This script requires Node.js 18+ with global fetch.");
    process.exit(1);
  }

  const url = `${BASE.replace(/\/$/, "")}/transactions?limit=1&offset=0`;
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  console.log("GET", url);
  try {
    const res = await fetch(url, { method: "GET", headers });
    const text = await res.text();
    console.log("Status:", res.status, res.statusText);
    console.log("Body:");
    console.log(text);
    if (!res.ok) process.exit(2);
  } catch (err) {
    console.error("Request failed:", err);
    process.exit(3);
  }
}

main();

