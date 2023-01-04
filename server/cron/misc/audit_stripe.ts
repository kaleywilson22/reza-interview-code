import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });
import { promises as fsPromises } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      stripe_id: true,
    },
    where: {
      reservation: {
        some: {
          completed_reservation: true,
        },
      },
    },
  });
  return users;
}

const check_order_number = async (sc: string) => {
  const payment_response = await stripe.paymentIntents.list({
    customer: sc,
    limit: 20,
  });
  const payment_intents = await payment_response.data;

  await Promise.all(
    payment_intents.map(async (pi: Stripe.PaymentIntent) => {
      const metadata = pi.metadata;

      if (metadata.hasOwnProperty("product")) {
        const total_quant: number = metadata.quantity
          .split(",")
          .filter((q) => q !== "")
          .map((q) => parseInt(q))
          .reduce((total, q) => {
            total += q;
            return total;
          });

        if (pi.amount / 7500 !== total_quant) {
          try {
            await fsPromises.writeFile(
              join(__dirname, "incorrect_counts"),
              `${sc}\n Metadata: ${total_quant} \n Official Count: ${
                pi.amount / 7500
              }\n`,
              {
                flag: "a+",
              }
            );
          } catch (err) {
            console.log(err);
          }
        }
      }
    })
  );
  return;
};

//retrieve payment intents
//check metadata
const retrieve_paymentIntents = async () => {
  const stripe_cust = (await getUsers()).map((user) => {
    return user.stripe_id;
  });

  try {
    await fsPromises.writeFile(
      join(__dirname, "incorrect_counts"),
      "Customer with Incorrect Counts \n",
      {
        flag: "w",
      }
    );
  } catch (err) {
    console.log(err);
  }

  const payment_list = stripe_cust.map((sc) => {
    return createPromiseFactory(async () => {
      if (sc !== null) {
        return await check_order_number(sc);
      }
    }, 200);
  });
  executeSequentially(payment_list);
};

retrieve_paymentIntents();
