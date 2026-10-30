import z from "zod";

export class AuthValidation {
  static REGISTER = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.email().max(200),
    password: z.string().min(8).max(1000)
  });

  static LOGIN = z.object({
    email: z.email().max(200),
    password: z.string().min(1).max(1000)
  });
}
