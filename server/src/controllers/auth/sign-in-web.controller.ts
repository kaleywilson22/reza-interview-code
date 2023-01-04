import { Request, Response } from "express";
import { prisma } from "../../server";
import jwt from "jsonwebtoken";
import config from "../../config/auth.config";
import { __prod__ } from "../../constants";
import { getDomain } from "../../utils";

export const signInWeb = async (req: Request, res: Response) => {
  const { verification_code } = req.body;
  const user = res.locals.user;
  try {
    const code = await prisma.code.findUnique({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "EMAIL_LOGIN",
        },
      },
    });

    if (!code) return res.status(404).send({ message: "code not found" });

    //Code is valid for 2 hours
    const time_is_valid =
      new Date().getTime() <
      new Date(code.updated_at).getTime() + 2 * 60 * 60 * 1000;
    const code_matches =
      parseInt(code.code || "0") === parseInt(verification_code);

    if (!time_is_valid || !code_matches)
      throw new Error("Code invalid or expired");

    const access_token = jwt.sign(
      { id: user.id },
      config.access_secret as string,
      {
        expiresIn: 60 * 10, // 10 minutes
      }
    );

    const refresh_token = jwt.sign(
      { id: user.id },
      config.refresh_secret as string,
      {
        expiresIn: 86400 * 7, // 1 month
      }
    );
    const { host: server_host } = req.headers;

    res.cookie("REZA_TOKEN", refresh_token, {
      expires: new Date(Date.now() + 2629800000),
      sameSite: __prod__ ? "strict" : "lax",
      httpOnly: __prod__,
      secure: __prod__,
      domain: getDomain(server_host),
    });

    return res.status(200).send(
      JSON.stringify({
        id: user.id,
        access_token: access_token,
      })
    );
    
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
