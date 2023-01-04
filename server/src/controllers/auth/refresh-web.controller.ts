import { Request } from "express";
import jwt from "jsonwebtoken";

import config from "../../config/auth.config";
import { __prod__ } from "../../constants";
import { getDomain } from "../../utils";

export const refreshWeb = async (req: Request, res: any) => {
  const user = res.locals.user;

  try {
    const access_token = jwt.sign(
      { id: user.id },
      config.access_secret as string,
      {
        expiresIn: 60 * 10, // 15 minutes
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
    res.status(200).send(
      JSON.stringify({
        access_token,
      })
    );
  } catch (err: any) {
    res.status(404).send(JSON.stringify({ message: err.message }));
  }
};
