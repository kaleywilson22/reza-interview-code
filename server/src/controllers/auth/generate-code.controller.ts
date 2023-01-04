import validator from "validator";
import { Request } from "express";
import { sendMail } from "../../utils/mail";
import * as errorCodeUtils from "../../utils/errors";
import { getTemplate } from "../../templates/code_template";
import { prisma } from "../../server";
import { __prod__ } from "../../constants";

export const generateCode = async (req: Request, res: any) => {
  let email = req.body.email;

  if (!email || !validator.isEmail(email.trim()))
    return res.status(400).json(errorCodeUtils.MISSING_PARAM);

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) return res.status(404).json(errorCodeUtils.USER_NOT_FOUND);

    let activation_code = Math.floor(Math.random() * 9000) + 1000;

    if (user.email === "testreza@yopmail.com") {
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

    const mailOptions = getTemplate(user.email, updated_user.code);

    if (__prod__) {
      sendMail(mailOptions, (err: any, _result: any) => {
        if (err) {
          return res.status(500).json(errorCodeUtils.CANNOT_SEND_MAIL);
        } else {
          res.status(200).send(JSON.stringify({ status: "ok", id: user.id }));
        }
      });
    } else {
      res.status(200).send(JSON.stringify({ status: "ok", id: user.id }));
    }
  } catch (err: any) {
    res.status(500).send({ message: err.message });
  }
};
