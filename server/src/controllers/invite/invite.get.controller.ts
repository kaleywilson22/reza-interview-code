import { Request, Response } from "express";
import { prisma } from "../../server";
import config from "../../config/auth.config";
import { __prod__ } from "../../constants";
import jwt from "jsonwebtoken";

export const getInviteLink = async (req: Request, res: Response) => {
  const { token } = req.query;
  let record: undefined | { i_id: number };
  try {
    if (token) {
      try {
        jwt.verify(
          String(token),
          config.invite_secret as string,
          (err: any, user: any) => {
            if (err) {
              throw new Error("token expired or invalid");
            } else {
              record = user;
            }
          }
        );
      } catch (e) {
        return res.status(401).json({ err: e.message });
      }
    }

    if (!record) throw Error("no invite found");

    const link = await prisma.invite_link.findFirst({
      where: { token: String(token) },
    });

    if (link?.invite_used == true) {
      return res.status(401).json({ err: "invite used" });
    }

    const user = await prisma.user.findUnique({
      where: { id: record.i_id as number },
    });

    const first_name = user?.full_name?.split(" ")[0];

    if (!user) throw Error("no invite found");
    return res
      .status(200)
      .send(JSON.stringify({ invited_name: first_name, i_id: record.i_id }));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
