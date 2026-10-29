import z from "zod";

export class AuthValidation {
  static REGISTER = z.object({
    name: z.string().max(200),
    email: z.email().max(200),
    password: z.string().max(1000)
  });

  static LOGIN = z.object({
    email: z.email().max(200),
    password: z.string().max(1000)
  });
}
