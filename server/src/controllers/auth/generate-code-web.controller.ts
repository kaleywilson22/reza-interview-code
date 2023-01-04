import { Request, Response } from "express";
import { sendMailjetEmail, template_ids } from "../../utils";
import { prisma } from "../../server";
import { __prod__ } from "../../constants";
import * as errorCodeUtils from "../../utils/errors";

export const getCodeWeb = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) return res.status(404).json(errorCodeUtils.USER_NOT_FOUND);
    let activation_code = Math.floor(Math.random() * 9000) + 1000;

    if (email === "testreza@yopmail.com") {
      //For test accunt just keep the same activation code
      activation_code = 1234;
    }

    const updated_user = await prisma.code.upsert({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "EMAIL_LOGIN",
        },
      },
      update: { code: activation_code.toString() },
      create: {
        code: activation_code.toString(),
        type: "EMAIL_LOGIN",
        user_id: user.id,
      },
    });

    const request = await sendMailjetEmail(
      email,
      template_ids.form_verification_code,
      { verification_code: updated_user.code }
    );

    if (!request.response.ok) throw Error("unable to send mail");

    return res.status(200).send(JSON.stringify({ success: true }));
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
