import { Request } from "express";

//the _ in _req means unused parameter in typescript
export const allAccess = async (_req: Request, res: any) => {
  res.status(200).send("public");
};
