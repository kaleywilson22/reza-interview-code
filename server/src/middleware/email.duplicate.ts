import { prisma } from "../server";
import { Request, NextFunction } from "express";

export const checkDuplicateEmail = async (
  req: Request,
  res: any,
  next: NextFunction
) => {
  const email = req.body.email;

  if (!email)
    return res
      .status(401)
      .send(JSON.stringify({ err: "email field not provided" }));

  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (user) {
    return res.status(400).send({
      message: "email in use",
    });
  }
  next();
};
