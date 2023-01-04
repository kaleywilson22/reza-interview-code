import axios from "axios";
import { Request, Response } from "express";
import { prisma } from "../../server";
import Stripe from "stripe";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const CREATE_USER_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v3/customers`;
const CREATE_ORDER_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v2/orders`;
const GET_CUSTOMER_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v3/customers`;
export const createSingleOrder = async (req: Request, res: Response) => {
  try {
    const id = res.locals.user.id;
    const {
      address1,
      address2,
      city,
      state,
      postal,
      name,
      country_code,
      country,
      variant_id,
      payment_intent,
      product_id,
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: id } });
    const names = name ? name.split(" ") : user?.full_name?.split("");
    const firstName = names[0];
    const lastName = names?.slice(1, names.length).join(" ");

    if (!user?.bc_id) {
      try {
        const new_customer = await axios.post(
          CREATE_USER_URL,
          [
            {
              email: user?.email,
              ...(user?.phone ? { phone: user?.phone } : {}),
              first_name: firstName,
              last_name: lastName,
              addresses: [
                {
                  first_name: firstName,
                  last_name: lastName,
                  city: city,
                  country_code: country_code,
                  address1: address1,
                  address2: address2,
                  state_or_province: state,
                  postal_code: postal,
                },
              ],
            },
          ],
          {
            headers: {
              "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
            },
          }
        );
        await prisma.user.update({
          where: { id: id },
          data: { bc_id: new_customer.data.data[0].id },
        });
      } catch (e) {
        try {
          const data = await axios.get(
            `${GET_CUSTOMER_URL}?email:in=${encodeURIComponent(user!.email)}`,
            {
              headers: {
                "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
              },
            }
          );
          const bc_id = data.data.data[0].id;
          await prisma.user.update({
            where: { id: id },
            data: { bc_id: bc_id },
          });
        } catch (e) {
          res.status(400).json({ message: e.response.data, e });
          return;
        }
      }
    }

    const u = await prisma.user.findUnique({ where: { id: id } });
    const shipping_address_base = {
      first_name: firstName,
      last_name: lastName,
      street_1: address1,
      street_2: address2,
      ...(user?.phone ? { phone: user?.phone } : {}),
      city: city,
      state: state,
      country: country,
      country_iso2: country_code,
      zip: postal,
    };
    const order_res = await axios.post(
      CREATE_ORDER_URL,
      {
        ...(u?.bc_id ? { customer_id: u?.bc_id } : {}),
        external_id: payment_intent,
        shipping_addresses: [
          { ...shipping_address_base, shipping_method: "Free Shipping" },
        ],
        billing_address: shipping_address_base,
        products: [{ product_id, variant_id, quantity: 1 }],
      },
      {
        headers: {
          "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
        },
      }
    );

    const sessions = (await stripe.checkout.sessions.list({
      payment_intent: payment_intent,
    })) as { data: Stripe.Checkout.Session[] };

    const session = sessions.data[0];
    const meta_data = session.metadata;
    const new_meta_data = { ...meta_data, bc_order_id: order_res.data.id };
    await stripe.paymentIntents.update(session.payment_intent, {
      metadata: new_meta_data,
    });

    res
      .status(200)
      .json({ message: "Order created successfully", id: order_res.data.id });
  } catch (e) {
    res.status(400).json({ message: e.response.data, e });
  }
};
