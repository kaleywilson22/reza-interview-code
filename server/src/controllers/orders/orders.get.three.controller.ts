import { Request } from "express";
import Stripe from "stripe";
import { prisma } from "../../server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const getOrderDetailThree = async (_req: Request, res: any) => {
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

    const checkout_session = (await stripe.checkout.sessions.list({
      customer: user?.stripe_id,
      limit: 100,
    })) as { data: Stripe.Checkout.Session[] };

    const filteredSessions = checkout_session.data.filter(
      (session) => session.status === "complete"
    );
    const details: any = [];

    const session_promises = filteredSessions.map(async (session) => {
      //get all the line items bought
      const listLineItems = await stripe.checkout.sessions.listLineItems(
        session.id
      );
      const items: any = [];
      let shipping = null;

      //check for metadata

      const promises = listLineItems.data.map(async (item: Stripe.LineItem) => {
        //check for meta data in payment intents

        //get the paymentIntent
        const payment_info = await stripe.paymentIntents.retrieve(
          session.payment_intent
        );

        const meta_data = await payment_info.metadata;

        //check for product updates
        if (meta_data.hasOwnProperty("product")) {
          const products: [string] = meta_data.product.split(",");
          const quantities: [number] = meta_data.quantity
            .split(",")
            .map((quant: string) => parseInt(quant));
          const total = quantities.reduce((total, item) => {
            total += item;
            return total;
          });

          if (item.quantity === null) {
            throw Error("No Quantitiy Specified");
          } else {
            const item_quantity = item.quantity;
            const product_promises = products.map(async (prod1, index) => {
              const prod = prod1.trim();
              if (prod !== "") {
                const product: Stripe.Product = await stripe.products.retrieve(
                  prod
                );

                const amount =
                  (item.amount_total / item_quantity) * quantities[index];
                const quantity = quantities[index];
                items.push({
                  product: {
                    ...product,
                    description: product.description,
                    metadata: item.price?.metadata,
                  },
                  amount: amount,
                  quantity: quantity,
                });
              }
            });
            await Promise.all(product_promises);
            if (total < item_quantity) {
              const new_quantity = item_quantity - total;
              const product: Stripe.Product = await stripe.products.retrieve(
                item.price?.product
              );
              const amount = (item.amount_total / item_quantity) * new_quantity;
              const quantity = new_quantity;
              items.push({
                product: {
                  ...product,
                  description: item.description,
                  metadata: item.price?.metadata,
                },
                amount: amount,
                quantity: quantity,
              });
            }
          }
        } else {
          const product: Stripe.Product = await stripe.products.retrieve(
            item.price?.product
          );
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
          });
        }

        //check for shipping updates
        if (meta_data.hasOwnProperty("line1")) {
          if (meta_data.hasOwnProperty("line2")) {
            shipping = {
              city: meta_data.city,
              line1: meta_data.line1,
              line2: meta_data.line2,
              state: meta_data.state,
              postal_code: meta_data.postal_code,
            };
          } else {
            shipping = {
              city: meta_data.city,
              line1: meta_data.line1,
              state: meta_data.state,
              postal_code: meta_data.postal_code,
            };
          }
        }
      });
      await Promise.all(promises);
      console.log(items);
      details.push({
        pi: session,
        items: items,
        shipping: shipping,
      });
    });

    await Promise.all(session_promises);
    res.status(200).send(
      JSON.stringify({
        details: details,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
