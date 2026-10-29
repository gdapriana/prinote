import { TodoController } from "@/controllers/todo.controller";
import { requireAuth } from "@/middlewares/auth";
import { Router } from "express";

const todoRoute = Router();

todoRoute.get("/get", requireAuth, TodoController.GET);
todoRoute.get("/query", requireAuth, TodoController.QUERY);
todoRoute.post("/", requireAuth, TodoController.CREATE);
todoRoute.patch("/:todoId", requireAuth, TodoController.UPDATE);
todoRoute.delete("/:todoId", requireAuth, TodoController.DELETE);

export default todoRoute;
