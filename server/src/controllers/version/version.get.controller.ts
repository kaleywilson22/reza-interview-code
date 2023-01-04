import { Request } from "express";
import * as errorCodeUtils from "../../utils/errors";

import { prisma } from "../../server";

export const getVersion = async (_req: Request, res: any) => {
  const user = await prisma.version.findFirst();

  if (!user) return res.status(404).json(errorCodeUtils.VERSION);

  res.status(200).send(JSON.stringify(user));
};
