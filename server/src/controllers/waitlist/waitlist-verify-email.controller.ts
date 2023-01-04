import { Request, Response } from "express";
import { sendMailjetEmail, template_ids } from "../../utils";
import { prisma } from "../../server";
import { __prod__ } from "../../constants";

export const verifyWaitlistEmail = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const activation_code = Math.floor(Math.random() * 9000) + 1000;

    const updated_waitlist = await prisma.waitlist.upsert({
      where: {
        email: email.toLowerCase().trim(),
      },
      update: { verification_code: parseInt(activation_code.toString()) },
      create: {
        verification_code: parseInt(activation_code.toString()),
        email: email.toLowerCase().trim(),
        count: 1,
      },
    });
    if (!updated_waitlist) throw Error("unable to find to waitlist");
    if (__prod__) {
      const request = await sendMailjetEmail(
        email,
        template_ids.form_verification_code,
        { verification_code: activation_code }
      );

      if (!request.response.ok) throw Error("unable to send mail");
    }
    return res.status(200).send(JSON.stringify({ ...updated_waitlist }));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
