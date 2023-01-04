import axios from "axios";
import { Request } from "express";
import { prisma } from "../../server";

const UPDATE_BC_CUSTOMER_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v3/customers`;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const updateEmail = async (req: Request, res: any) => {
  const user = await res.locals.user;
  const { resetEmail, verification_code } = req.body;

  try {
    const code = await prisma.code.findUnique({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "EMAIL_RESET",
        },
      },
    });

    if (!code) return res.status(404).send({ message: "code not found" });

    const time_is_valid =
      new Date().getTime() <
      new Date(code.updated_at).getTime() + 2 * 60 * 60 * 1000; //Code is valid for 2 hours
    const code_matches =
      parseInt(code.code || "0") === parseInt(verification_code);

    if (!time_is_valid || !code_matches)
      throw new Error("Code invalid or expired");

    const user_1 = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!user_1) throw Error("can not find current user");

    const email_type = await prisma.email_type.findUnique({
      where: {
        type: "PRIMARY",
      },
    });

    const user_res = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email: resetEmail,
      },
    });

    await prisma.user_email.upsert({
      where: {
        user_id_email_type_id: {
          user_id: user.id,
          email_type_id: email_type?.id || 1,
        },
      },
      update: {
        email: resetEmail,
      },
      create: {
        user_id: user.id,
        email_type_id: email_type?.id || 1,
        email: resetEmail,
      },
    });

    if (!user_res) throw Error("can not update user email");

    await prisma.user_email.deleteMany({
      where: {
        email: user_1.email,
      },
    });

    if (user_1.bc_id) {
      await axios.put(
        UPDATE_BC_CUSTOMER_URL,
        [{ email: user_res.email, id: user_res.bc_id }],
        {
          headers: {
            "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
          },
        }
      );
    }
    if (user_res.stripe_id) {
      await stripe.customers.update(user_res.stripe_id, {
        email: user_res.email,
      });
    }
    res.status(200).send(
      JSON.stringify({
        user: user_res,
      })
    );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
