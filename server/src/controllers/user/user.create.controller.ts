import { Request } from "express";

import { prisma } from "../../server";
import isEmail from "validator/lib/isEmail";

export const createSingleUser = async (req: Request, res: any) => {
  const { email, phone, full_name, first_name, last_name, city, lyop } =
    req.body;
  try {
    if (!email || !isEmail(email))
      throw Error("email field invalid or not included");
    const user = await prisma.user.create({
      data: {
        full_name: full_name,
        first_name: first_name,
        last_name: last_name,
        email: email.toLowerCase().trim(),
        phone: phone,
        profile: {
          create: { city: city, lyop: lyop },
        },
        user_email: {
          create: {
            email: email,
            type: { connect: { type: "PRIMARY" } },
          },
        },
        user_phone: {
          create: {
            phone: phone,
            type: { connect: { type: "PRIMARY" } },
          },
        },
      },
    });

    if (!user) throw Error("can not create user");
    res.status(200).send(JSON.stringify(user));
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
