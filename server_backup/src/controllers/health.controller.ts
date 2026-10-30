import { Request, Response } from "express";
import { pool } from "../configs/db.js";
import { ApiResponse } from "../utils/api-response.js";

/**
 * Basic health check endpoint
 * GET /api/v1/health
 */
export const healthCheck = async (_req: Request, res: Response) => {
  return ApiResponse.Success(res, "Service is healthy", {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Detailed health check with system information
 * GET /api/v1/health/detailed
 */
export const detailedHealthCheck = async (_req: Request, res: Response) => {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      unit: "MB"
    },
    cpu: {
      usage: process.cpuUsage()
    }
  };

  return ApiResponse.Success(res, "Service is healthy", healthData);
};

// Liveness is independent of the database; readiness verifies its availability.
export const readinessCheck = async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    return ApiResponse.ok(res, "Service is ready", {
      status: "ready",
      database: "up"
    });
  } catch {
    return res.status(503).json({
      success: false,
      statusCode: 503,
      message: "Database is unavailable"
    });
  }
};
