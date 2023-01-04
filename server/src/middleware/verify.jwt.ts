import { NextFunction, Request, Response } from "express";
import validateJWT from "express-jwt";
import jwt from "jsonwebtoken";

import config from "../config/auth.config";

export const verifyAccessToken = validateJWT({
  secret: config.access_secret as string,
  algorithms: ["HS256"],
  resultProperty: "locals.user",
});

export const verifyRefreshTokenApp = validateJWT({
  secret: config.refresh_secret as string,
  algorithms: ["HS256"],
  resultProperty: "locals.user",
});

export const verifyRefreshAccessWeb = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.REZA_TOKEN as string;

  if (!token) {
    return res.status(401).json({ data: null });
  }
  try {
    jwt.verify(
      token,
      config.access_secret as string,
      (err: any, user: any) => {
        if (err) {
          throw err;
        } else {
          return (res.locals.user = { ...user, token });
        }
      }
    );
  } catch (e) {
    return res.status(401).json({ data: null, err: e });
  }

  return next();
};


export const verifyRefreshTokenWeb = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.REZA_TOKEN as string;

  if (!token) {
    return res.status(401).json({ data: null });
  }
  try {
    jwt.verify(
      token,
      config.refresh_secret as string,
      (err: any, user: any) => {
        if (err) {
          throw err;
        } else {
          return (res.locals.user = { ...user, token });
        }
      }
    );
  } catch (e) {
    return res.status(401).json({ data: null, err: e });
  }

  return next();
};
