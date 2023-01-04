import { order } from "@prisma/client";
import { Request } from "express";
import { prisma } from "../../server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const getOrderDetail = async (_req: Request, res: any) => {
  const id = res.locals.user.id;

  const order = await prisma.order.findMany({
    where: {
      user_id: id,
    },
  });

  try {
    const details: any = [];
    const promises = order.map(async (item: order) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        item.payment_intent
      );

      const listLineItems = await stripe.checkout.sessions.listLineItems(
        item.checkout_session
      );
      const items: any = [];

      const promises = listLineItems.data.map(async (item: any) => {
        const product = await stripe.products.retrieve(item.price.product);

        const amount = item.amount_total;
        const quantity = item.quantity;
        items.push({
          product: product,
          amount: amount,
          quantity: quantity,
        });
      });

      await Promise.all(promises);

      details.push({
        pi: paymentIntent,
        items: items,
      });
    });

    await Promise.all(promises);

    res.status(200).send(
      JSON.stringify({
        details: details,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
