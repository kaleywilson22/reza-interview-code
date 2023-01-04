import { Request } from "express";
import * as errorCodeUtils from "../../utils/errors";

import { prisma } from "../../server";

export const unlockReservation = async (_req: Request, res: any) => {
  const id = res.locals.user.id;

  await prisma.reservation.updateMany({
    where: {
      user_id: id,
    },
    data: {
      unlocked: true,
    },
  });

  const updated_reservation = await prisma.reservation.findMany({
    where: {
      user_id: id,
    },
  });
  if (!updated_reservation)
    return res.status(404).json(errorCodeUtils.USER_NOT_FOUND);

  res.status(200).send(JSON.stringify({ ...updated_reservation[0] }));
};
