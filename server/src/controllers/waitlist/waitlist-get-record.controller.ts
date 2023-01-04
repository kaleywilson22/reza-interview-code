import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/auth.config";
import { prisma } from "../../server";

export const getWaitlistRecord = async (req: Request, res: Response) => {
  const { email, verification_code, token, source } = req.body;
  let record: undefined | { w_id: number; source: string };
  if (token) {
    try {
      jwt.verify(
        token,
        config.signin_secret as string,
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
  try {
    const has_record = (record && record.w_id != undefined) || false;

    switch (true) {
      case has_record && source == "phone":
        await prisma.waitlist.update({
          where: {
            id: record!.w_id,
          },
          data: {
            phone_verified: true,
          },
        });
        break;

      case has_record && source == "email":
        await prisma.waitlist.update({
          where: {
            id: record!.w_id,
          },
          data: {
            email_verified: true,
          },
        });
        break;

      default:
        break;
    }
    const waitlist = await prisma.waitlist.findMany({
      where: {
        id: record?.w_id,
        email: email?.toLowerCase().trim(),
        verification_code: verification_code
          ? parseInt(verification_code)
          : undefined,
      },
    });

    if (!waitlist) throw Error("unable to find to waitlist");

    const invited_by = await prisma.user.findUnique({
      where: {
        id: waitlist[0]?.invited_by || 0,
      },
    });

    return res.status(200).send(
      JSON.stringify({
        ...waitlist[0],
        invited_by_name: invited_by?.full_name || undefined,
      })
    );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
