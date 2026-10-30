import { Router } from "express";
import {
  healthCheck,
  detailedHealthCheck,
  readinessCheck
} from "../controllers/health.controller.js";

const router = Router();

router.get("/", healthCheck);
router.get("/ready", readinessCheck);
router.get("/detailed", detailedHealthCheck);

export default router;
