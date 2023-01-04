import { Request } from "express";
import * as errorCodeUtils from "../../utils/errors";

import { prisma } from "../../server";

export const getSingleUser = async (_req: Request, res: any) => {
  const id = res.locals.user.id;

  const user = await prisma.user.findUnique({
    where: {
      id: id as number,
    },
  });

  if (!user) return res.status(404).json(errorCodeUtils.USER_NOT_FOUND);

  res.status(200).send(JSON.stringify(user));
};
