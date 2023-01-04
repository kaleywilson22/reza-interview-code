import { Request } from "express";

import { getDomain } from "../../utils";

export const logout = async (req: Request, res: any) => {
  const { host: server_host } = req.headers;

  res.cookie("REZA_TOKEN", "", {
    maxAge: -1,
    sameSite: "lax",
    httpOnly: true,
    secure: false,
    domain: getDomain(server_host),
    path: "/",
  });

  res.status(200).send();
};
