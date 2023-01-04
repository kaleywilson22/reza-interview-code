import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/auth.config";
import { __prod__ } from "../../constants";
import { prisma } from "../../server";

export const generateInviteLink = async (_req: Request, res: Response) => {
  const id = res.locals.user.id;
  try {
    const invite_token = jwt.sign(
      { i_id: id },
      config.invite_secret as string,
      {
        expiresIn: 60 * 60 * 24 * 7, // 1 Week
      }
    );

    const update_user_count = await prisma.user.update({
      where: { id: id },
      data: { invite_count: { increment: 1 } },
    });

    if (!invite_token) throw Error("unable to create invite link");

    const invite_link = __prod__
      ? `https://rezafootwear.com/invite?token=${invite_token}`
      : `http://localhost:3000/invite?token=${invite_token}`;

    if (!invite_link) throw Error("unable to send link");

    return res
      .status(200)
      .send(
        JSON.stringify({ invite_link, count: update_user_count.invite_count })
      );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
