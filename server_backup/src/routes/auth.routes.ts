import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { authLimiter } from "../utils/session.js";
import { Router } from "express";

const authRoute = Router();

authRoute.post("/register", authLimiter, AuthController.REGISTER);
authRoute.post("/login", authLimiter, AuthController.LOGIN);
authRoute.delete("/logout", AuthController.LOGOUT);
authRoute.get("/me", requireAuth, AuthController.ME);

export default authRoute;
