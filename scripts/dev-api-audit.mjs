/**
 * Local API for WC card-contract live audits — auth disabled.
 * Usage: npm run dev:api:audit
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
process.env.UR_TAKE_REQUIRE_AUTH = "false";

await import("../dev-api-server.mjs");
