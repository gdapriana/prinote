import { expect, test } from "bun:test";
import type { Request, Response } from "express";
import { securityHeaders } from "../src/middlewares/security-headers.js";

test("Helmet installs its security headers through the explicit CommonJS entrypoint", () => {
  const headers = new Map<string, string>();
  headers.set("x-powered-by", "Express");
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase());
    }
  } as unknown as Response;
  let completed = false;
  securityHeaders({} as Request, response, error => {
    if (error) throw error;
    completed = true;
  });
  expect(completed).toBe(true);
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
  expect(headers.get("content-security-policy")).toContain(
    "default-src 'self'"
  );
  expect(headers.get("strict-transport-security")).toContain("max-age=");
  expect(headers.has("x-powered-by")).toBe(false);
});
