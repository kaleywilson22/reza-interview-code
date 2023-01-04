import config from "../../config/auth.config";
import jwt from "jsonwebtoken";
import { getDomain } from "../../utils";
import { __prod__ } from "../../constants";

export const isAuthenticated = async (req: any, res: any) => {
  const user = res.locals.user;
  const { host: server_host } = req.headers;

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

  res.cookie("REZA_TOKEN", refresh_token, {
    expires: new Date(Date.now() + 2629800000),
    sameSite: __prod__ ? "strict" : "lax",
    httpOnly: __prod__,
    secure: __prod__,
    domain: getDomain(server_host),
  });

  return res.status(200).send(
    JSON.stringify({
      access_token,
    })
  );
};
