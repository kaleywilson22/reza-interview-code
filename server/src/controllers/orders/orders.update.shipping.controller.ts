import { Request } from "express";
import { prisma } from "../../server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const updateShipping = async (_req: Request, res: any) => {
  const id = res.locals.user.id;
  const { payment_intent, firstLine, secLine, city, state, postal, name } =
    _req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user?.stripe_id) {
      throw new Error("No orders found");
    }

    let metadata;
    if (secLine === "") {
      metadata = {
        name: name,
        city: city,
        state: state,
        line1: firstLine,
        line2: null,
        postal_code: postal,
      };
    } else {
      metadata = {
        name: name,
        city: city,
        state: state,
        line1: firstLine,
        line2: secLine,
        postal_code: postal,
      };
    }
    const payment_info = await stripe.paymentIntents.update(payment_intent, {
      metadata: metadata,
    });

    res.status(200).send(
      JSON.stringify({
        updated_info: payment_info,
        message: "Your shipping update is complete.",
      })
    );
  } catch (err: any) {
    console.log(err.response.data);
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
