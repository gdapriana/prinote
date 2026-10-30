import { Server } from "http";
import { pool } from "../configs/db.js";
import { logger } from "./logger.js";

export const configureGracefulShutdown = (server: Server) => {
  const signals = ["SIGTERM", "SIGINT"];

  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`\n${signal} signal received. Shutting down gracefully...`);

      server.close(async err => {
        if (err) {
          logger.error(err, "Error during server close");
          process.exit(1);
        }

        try {
          await pool.end();
          logger.info("HTTP server and database pool closed.");
          process.exit(0);
        } catch (error) {
          logger.error(error, "Error closing database pool");
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    });
  });
};
