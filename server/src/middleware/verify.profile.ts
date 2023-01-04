import { prisma } from "../server";
import { Request, NextFunction, Response } from "express";

export const verifyProfile = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = res.locals.user;
  try {
    const profile = await prisma.profile.findUnique({
      where: {
        user_id: parseInt(user.id),
      },
    });

    if (!profile) {
      return res.status(404).send({ message: "profile not found" });
    }
    res.locals.profile = profile;
    return next();
  } catch (e: any) {
    res.status(500).send({ message: e.message });
  }
};
