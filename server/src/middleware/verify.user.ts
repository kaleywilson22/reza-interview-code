import { prisma } from "../server";
import { Request, NextFunction, Response } from "express";

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const email = req.body.email;

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });

  res.locals.user = user;
  return next();
};
