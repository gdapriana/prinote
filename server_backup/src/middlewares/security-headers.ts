import { createRequire } from "node:module";
import type { RequestHandler } from "express";
import type { HelmetOptions } from "helmet";

// Helmet's CJS and ESM declaration entrypoints expose its default differently.
// Load the actual callable CommonJS export explicitly so Vercel's declaration
// selection cannot turn a default import into a non-callable module namespace.
const require = createRequire(import.meta.url);
const helmet: (
  options?: Readonly<HelmetOptions>
) => RequestHandler = require("helmet");

export const securityHeaders = helmet();
