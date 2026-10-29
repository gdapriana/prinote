import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { notFoundHandler } from "./middlewares/not-found-handler.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { setupSwagger } from "./configs/swagger.js";
import healthRoutes from "./routes/health.routes.js";

import sourceMapSupport from "source-map-support";
import env from "./configs/env.js";
import authRoute from "./routes/auth.routes.js";
import { authenticate } from "./middlewares/auth.js";
import todoRoute from "./routes/todo.routes.js";
sourceMapSupport.install();

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin:
      env.CORS_ORIGIN ??
      (env.NODE_ENV === "development" ? "http://localhost:3000" : false),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
setupSwagger(app);

app.get("/", (req: Request, res: Response) => {
  res.redirect("/api/v1/health");
});

app.use("/api/v1/health", healthRoutes);

app.use("/api/auth", authenticate, authRoute);
app.use("/api/todos", authenticate, todoRoute);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
