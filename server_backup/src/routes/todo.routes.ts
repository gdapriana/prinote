import { TodoController } from "../controllers/todo.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { Router } from "express";

const todoRoute = Router();

todoRoute.get("/get", requireAuth, TodoController.GET);
todoRoute.get("/query", requireAuth, TodoController.QUERY);
todoRoute.post("/", requireAuth, TodoController.CREATE);
todoRoute.patch("/:todoId", requireAuth, TodoController.UPDATE);
todoRoute.delete("/:todoId", requireAuth, TodoController.DELETE);

export default todoRoute;
