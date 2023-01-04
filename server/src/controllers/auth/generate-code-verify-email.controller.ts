import { Request, Response } from "express";
import { sendMailjetEmail, template_ids } from "../../utils";
import { prisma } from "../../server";
import { __prod__ } from "../../constants";
import * as errorCodeUtils from "../../utils/errors";

export const getCodeWeb_UpdateEmail = async (req: Request, res: Response) => {
  const user = res.locals.user;
  const { resetEmail } = req.body;
  try {
    if (!user) return res.status(404).json(errorCodeUtils.USER_NOT_FOUND);
    let activation_code = Math.floor(Math.random() * 9000) + 1000;

    if (resetEmail === "testreza@yopmail.com") {
      activation_code = 1234; //For test accunt just keep the same activation code
    }

    const updated_user = await prisma.code.upsert({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "EMAIL_RESET",
        },
      },
      update: { code: activation_code.toString() },
      create: {
        code: activation_code.toString(),
        type: "EMAIL_RESET",
        user_id: user.id,
      },
    });

    const email_type = await prisma.email_type.findUnique({
      where: {
        type: "RESET",
      },
    });

    await prisma.user_email.upsert({
      where: {
        user_id_email_type_id: {
          user_id: user!.id,
          email_type_id: email_type?.id || 3,
        },
      },
      update: {
        email: resetEmail,
        email_type_id: email_type?.id || 3,
      },
      create: {
        user_id: user.id,
        email: resetEmail,
        email_type_id: email_type?.id || 3,
      },
    });

    const request = await sendMailjetEmail(
      resetEmail,
      template_ids.reset_email,
      { verification_code: updated_user.code }
    );

    if (!request.response.ok) throw Error("unable to send mail");

    return res.status(200).send(JSON.stringify({ success: true }));
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
