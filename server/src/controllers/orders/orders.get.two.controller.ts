import { Request } from "express";
import Stripe from "stripe";
import { prisma } from "../../server";

const fs = require("fs");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  telemetry: false,
});

export const getOrderDetailTwo = async (_req: Request, res: any) => {
  const id = res.locals.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });

    if (!user?.stripe_id) {
      throw new Error("No orders found");
    }

    const paymentIntents = (await stripe.checkout.sessions.list({
      customer: user?.stripe_id,
      limit: 100,
    })) as { data: Stripe.Checkout.Session[] };

    const filteredIntents = paymentIntents.data.filter(
      (intent) => intent.status === "complete"
    );
    const details: any = [];
    const promises = filteredIntents.map(async (intent) => {
      const listLineItems = await stripe.checkout.sessions.listLineItems(
        intent.id
      );
      const items: any = [];

      const promises = listLineItems.data.map(async (item: Stripe.LineItem) => {
        const product: Stripe.Product = await stripe.products.retrieve(
          item.price?.product
        );

        try {
          const refunds = await stripe.refunds.retrieve({
            payment_intent: intent.id,
          });

          const refund = refunds.status;
          const amount = item.amount_total;
          const quantity = item.quantity;
          items.push({
            product: {
              ...product,
              description: item.description,
              metadata: item.price?.metadata,
            },
            amount: amount,
            quantity: quantity,
            refund: refund,
          });
        } catch (error: any) {
          const amount = item.amount_total;
          const quantity = item.quantity;
          items.push({
            product: {
              ...product,
              description: item.description,
              metadata: item.price?.metadata,
            },
            amount: amount,
            quantity: quantity,
            refund: "none",
          });
        }
      });
      await Promise.all(promises);

      details.push({
        pi: intent,
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

export const getAllOrderTwo = async (_req: Request, res: any) => {
  //const intents: Stripe.Checkout.Session[] = [];
  let Total = 0;
  let Total_BL = 0;
  let Total_WH = 0;

  let data = "";
  try {
    // const paymentIntents = (await stripe.checkout.sessions.list({
    //   limit: 1000,
    //   status: "complete",
    // })) as {
    //   data: Stripe.Checkout.Session[];
    // };

    await stripe.checkout.sessions
      .list({})
      .autoPagingEach(async function (intent: Stripe.Checkout.Session) {
        if (intent.status === "complete") {
          const listLineItems = await stripe.checkout.sessions.listLineItems(
            intent.id
          );

          listLineItems.data.map(async (item: Stripe.LineItem) => {
            const description = item.description;
            console.log("item", description);
            if (description.includes("BL")) Total_BL += 1;
            if (description.includes("WH")) Total_WH += 1;
            // if (description.includes("REZA-1-12M/13.5W-WH")) REZA_1_12M_wh += 1;
            // if (description.includes("REZA-1-12M/13.5W-BL")) REZA_1_12M_bl += 1;

            data = "\r" + description;
            fs.appendFileSync("demoA.csv", data);

            // intents.push(intent);
            Total += 1;
            console.log("Total Item", Total);
            console.log("BL", Total_BL);
            console.log("WH ", Total_WH);
            console.log("WH ", Total_WH);
          });
        }
      });

    // await Promise.all(promises);
    console.log("final details");
    res.status(200).send(
      JSON.stringify({
        details: "coucoc",
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
