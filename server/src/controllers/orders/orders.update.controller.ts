import { Request } from "express";
import Stripe from "stripe";
import { prisma } from "../../server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const updateOrder = async (_req: Request, res: any) => {
  const id = res.locals.user.id;
  const { original_product, new_product, quantity, payment_intent_id } =
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

    if (original_product == new_product) {
      throw new Error("Choose a different product");
    }

    const sessions = (await stripe.checkout.sessions.list({
      payment_intent: payment_intent_id,
    })) as { data: Stripe.Checkout.Session[] };

    const session = sessions.data[0];

    // get line items from the checkout session
    const listLineItems = (await stripe.checkout.sessions.listLineItems(
      session.id
    )) as { data: Stripe.LineItem[] };

    //get metadata from payment intent
    const payment_info = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );
    const meta_data = await payment_info.metadata;
    // create strings for new products/quantities
    let new_products = ``;
    let new_quantities = ``;

    //if there is not previous meta data
    if (!meta_data.hasOwnProperty("product")) {
      console.log("no update");
      new_products = new_products.concat(new_product + ",");
      new_quantities = new_quantities.concat(quantity + ",");
      await Promise.all(
        listLineItems.data.map(async (item: Stripe.LineItem) => {
          if (item.price?.product == original_product) {
            if (item.quantity && Number(parseInt(quantity)) != item.quantity) {
              new_products = new_products.concat(item.price?.product + ",");
              new_quantities = new_quantities.concat(
                String(item.quantity - parseInt(quantity)) + ","
              );
            }
          } else {
            const quant = item.quantity?.toString();
            new_products = new_products.concat(`${item.price?.product},`);
            new_quantities = new_quantities.concat(`${quant},`);
          }
        })
      );
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: { product: new_products, quantity: new_quantities },
      });
    } else {
      //if product to change is not the original and meta data for a product doesn't exist
      const products: [string] = meta_data.product
        .split(",")
        .filter((p: string) => p !== "");
      const quantities: [string] = meta_data.quantity
        .split(",")
        .filter((q: string) => q !== "");

      let add = true;

      //loop through all the "order changes" from metadata to find products to replace
      products.map((prod1: any, index) => {
        const prod = prod1.trim();
        if (prod !== original_product) {
          if (prod === new_product) {
            const new_quant: number =
              parseInt(quantities[index]) + parseInt(quantity);
            new_quantities = new_quantities.concat(`${new_quant},`);
            add = false;
          } else {
            new_quantities = new_quantities.concat(`${quantities[index]},`);
          }
          new_products = new_products.concat(`${prod},`);
        } else {
          //if the original product's quantity is more than the new product's quantity
          if (parseInt(quantities[index]) > quantity) {
            new_products = new_products.concat(`${prod},`);
            const new_quant: number =
              parseInt(quantities[index]) - parseInt(quantity);
            new_quantities = new_quantities.concat(`${new_quant},`);
          }
        }
      });

      // add the new products if they don't match any from the meta data
      if (add) {
        new_products = new_products.concat(`${new_product}`);
        new_quantities = new_quantities.concat(`${quantity}`);
      }

      const keys = Object.keys(meta_data).filter(
        (key: string) => key !== "product" && key !== "quantity"
      );

      const new_meta_data = keys.reduce(
        (current: { [x: string]: any }, key: string | number) => {
          current[key] = meta_data[key];
          return current;
        },
        {}
      );

      new_meta_data.product = new_products;
      new_meta_data.quantity = new_quantities;
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: new_meta_data,
      });
    }

    res.status(200).send(
      JSON.stringify({
        message: "Your order update is complete.",
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
