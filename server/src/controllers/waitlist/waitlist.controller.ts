import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { create_shortlink } from "../../utils/create_short_link";

import config from "../../config/auth.config";
import { __prod__ } from "../../constants";
import { prisma } from "../../server";
import { sendMailjetEmail, template_ids } from "../../utils";
import { sendSmsFromTemplate } from "../../utils/twillio";

export const addToWaitList = async (req: Request, res: Response) => {
  const { email, phone, invited_by, dont_send_email } = req.body;
  try {
    const waitlist = await prisma.waitlist.upsert({
      where: {
        email: email.toLowerCase().trim() as string,
      },
      update: {
        email: email.toLowerCase().trim() as string,
        phone: phone,
        invited_by: parseInt(invited_by) || undefined,
        count: { increment: 1 },
      },
      create: {
        email: email.toLowerCase().trim() as string,
        phone: phone,
        count: 1,
        invited_by: parseInt(invited_by) || undefined,
      },
    });
    if (!waitlist) throw Error("unable to add to waitlist");

    let invited_by_name;
    if (invited_by) {
      const invite_user = await prisma.user.findUnique({
        where: {
          id: invited_by,
        },
        select: {
          full_name: true,
        },
      });
      invited_by_name = invite_user?.full_name;
    }

    const waitlist_token = jwt.sign(
      { w_id: waitlist.id },
      config.signin_secret as string,
      {
        expiresIn: 60 * 60 * 24 * 7, // 1 Week
      }
    );

    const application_link_v2 = __prod__
      ? `https://rezafootwear.com/apply?t=${waitlist_token}`
      : `http://localhost:3000/apply?t=${waitlist_token}`;

    if (!dont_send_email) {
      const request = await sendMailjetEmail(
        email,
        template_ids.waitlist_template_v2,
        {
          invited_by: invited_by_name ? invited_by_name : "",
          application_link_v2: `${application_link_v2}&source=email`,
        }
      );

      if (!request.response.ok) throw Error("unable to send mail");

      if (phone && !dont_send_email) {
        const phone_short_link = await create_shortlink(
          `${application_link_v2}&source=phone`
        );
        await sendSmsFromTemplate(
          phone,
          "AFTER_WAITLIST",
          phone_short_link.shortURL || application_link_v2
        );
      }
    }
    return res.status(200).send(JSON.stringify(waitlist));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
