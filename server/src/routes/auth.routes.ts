import { AuthController } from "@/controllers/auth.controller";
import { requireAuth } from "@/middlewares/auth";
import { authLimiter } from "@/utils/session";
import { Router } from "express";

const authRoute = Router();

authRoute.post("/register", authLimiter, AuthController.REGISTER);
authRoute.post("/login", authLimiter, AuthController.LOGIN);
authRoute.delete("/logout", AuthController.LOGOUT);
authRoute.get("/me", requireAuth, AuthController.ME);

export default authRoute;
