import { prisma } from "../server";
import { Request, NextFunction, Response } from "express";

function extractToken(req: Request) {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}

export const checkMagicLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) return res.status(400).send();

  let already_in_db = false;
  let token_in_db;
  try {
    token_in_db = await prisma.token.create({
      data: {
        token: token,
      },
    });
  } catch (e) {
    already_in_db = true;
  }
  if (already_in_db || !token_in_db) return res.status(400).send();
  return next();
};
