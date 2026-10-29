import z from "zod";

export const queryValidation = <
  const T extends readonly [string, ...string[]]
>({
  sortEnum
}: {
  sortEnum: T;
}) => ({
  take: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.guid().optional(),
  sortBy: z.enum(sortEnum).default(sortEnum[0]),
  orderBy: z.enum(["desc", "asc"]).default("desc")
});

export const getValidation = ({ by }: { by: string[] }) =>
  z.object({
    by: z.enum(by),
    value: z.string().min(1)
  });

export const deleteValidation = ({ by }: { by: string[] }) =>
  z.object({
    by: z.enum(by),
    value: z.string().min(1)
  });

export const isUuid = (v?: string) => z.guid().safeParse(v).success;
