import { promises as fsPromises } from "fs";
import Stripe from "stripe";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";
import { set_default_pm } from "./set_default_payment";
import * as dotenv from "dotenv";
import { join } from "path";
import * as readline from "readline";
dotenv.config({ path: __dirname + "/../../.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const API_URL = `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_API_STORE_HASH}/v2/`;
const BC_SHOE_ID = 112;
/**
 * script is to create orders in BigCommerce and to create invoices in Stripe to charge card on file
 * Questions:
 * - Want a single invoice/order for all orders a customer might have?
 * - unable to change shipping address in the stripe invoice, is that a problem? Will be able to for BigCommerce.
 * Things to do:
 * - Add discount BC order - good
 * - Add discount to Stripe invoice for 'Founder' - good
 * - Add completion field in payment intent metadata - good
 * - Add terminal input to do certain number of customers
 * - add webhook to listen for failed invoices
 * - add shipping cost
 * -
 */

/** test with my test order */
const make_stripe_invoice = async (pi: Stripe.PaymentIntent) => {
  try {
    //check refunds for this order
    let full_refund = false;
    pi.charges.data?.forEach((charge: Stripe.Charge) => {
      if (charge.refunded) {
        full_refund = true;
      }
    });

    //only continue if a full refund was NOT issued
    if (!full_refund) {
      //find customer
      const payment_intent = pi.id;
      const customer_id = pi.customer !== null ? pi.customer.toString() : "";
      //add to transcript
      try {
        await fsPromises.writeFile(
          join(__dirname, "Transcript"),
          "Payment Intent: " + payment_intent + "\n\t",
          { flag: "a+" }
        );
      } catch (error1) {
        throw new Error("Transcript error");
      }

      //set default payment method
      try {
        await set_default_pm(customer_id);
      } catch (error2) {
        throw error2;
      }

      //just find the first session used with the payment intent
      const session_list = await stripe.checkout.sessions.list({
        payment_intent: payment_intent,
      });
      const session = await session_list.data[0];

      // find meta data and any changes
      const metadata = pi.metadata;
      let products: string[] = [];
      let quantities: number[] = [];
      let refunds: string[] = [];
      let total = 0;
      let shipping_local = true;
      let total_quantity = 0;

      //check if invoice is already created
      if (!metadata.hasOwnProperty("invoice_created")) {
        if (metadata.hasOwnProperty("refund")) {
          refunds = metadata.refund
            .split(",")
            .filter((r: string) => r !== "")
            .map((r) => r.trim());
        }

        //save total metadata
        if (metadata.hasOwnProperty("total")) {
          total = parseInt(metadata.total.trim());
        }
        //save shipping local
        if (metadata.hasOwnProperty("isLocal")) {
          shipping_local = metadata.isLocal.trim() === "true";
        }

        //get shoe information
        if (metadata.hasOwnProperty("product")) {
          products = metadata.product
            .split(",")
            .filter((p: string) => p !== "")
            .map((p: string) => p.trim());
          quantities = metadata.quantity
            .split(",")
            .filter((q: string) => q !== "")
            .map((quant: string) => parseInt(quant.trim()));

          //find total
          total_quantity = quantities.reduce((sum, q) => sum + q, 0);

          if (refunds.length > 0) {
            let subRefunds = refunds;
            quantities = quantities.map((quant: number, index) => {
              let finalQuant = quant;
              subRefunds.forEach((refund) => {
                if (refund === products[index]) {
                  finalQuant -= 1;
                }
              });
              subRefunds = subRefunds.filter(
                (refund) => refund !== products[index]
              );
              return finalQuant;
            });

            products = products.filter(
              (_product, index) => quantities[index] !== 0
            );
            products = await Promise.all(
              products.map(async (p: string) => {
                const prod: Stripe.Product = await stripe.products.retrieve(p);
                return prod.description ? prod.description : "no_sku";
              })
            );
            quantities = quantities.filter((quant) => quant !== 0);
          }
        } else {
          const line_items = (
            await stripe.checkout.sessions.listLineItems(session.id)
          ).data;
          line_items.forEach((li: Stripe.LineItem) => {
            let quantity = li.quantity ? li.quantity : 1;

            total_quantity += quantity;

            if (refunds.length > 0) {
              refunds.forEach((r) => {
                if (r === `${li.price?.product}`) {
                  quantity -= 1;
                  refunds = refunds.filter(
                    (refund) => refund !== `${li.price?.product}`
                  );
                }
              });
            }
            if (quantity > 0) {
              products.push(li.description);
              quantities.push(quantity);
            }
          });
        }

        //update shipping address if necessary
        if (metadata.hasOwnProperty("state")) {
          await stripe.customers.update(customer_id, {
            shipping: {
              address: {
                city: metadata.city,
                country: metadata.country,
                line1: metadata.line1,
                line2: metadata.line2,
                postal_code: metadata.postal_code,
                state: metadata.state,
              },
              name: metadata.name,
            },
          });
        }

        //define price per shoe; takes in account founders discount
        let per_shoe = 20000;
        if (total_quantity * 275 !== total) {
          per_shoe = 14500;
        }

        // create invoice items
        try {
          await Promise.all(
            products.map(async (p: string, index) => {
              const item = await stripe.invoiceItems.create({
                customer: customer_id,
                amount: per_shoe * quantities[index],
                currency: "usd",
                description: `${p} (quantity: ${quantities[index]})`,
                metadata: {
                  product: p,
                  quantity: `${quantities[index]}`,
                },
              });
              return item;
            })
          );
          if (!shipping_local) {
            await stripe.invoiceItems.create({
              customer: customer_id,
              amount: 4000,
              currency: "usd",
              description: "Shipping cost",
            });
          }
        } catch (error3) {
          throw new Error("Invoice Items were not created");
        }

        //attempt to create invoice
        try {
          const invoice: Stripe.Invoice = await stripe.invoices.create({
            customer: customer_id,
            auto_advance: true,
            collection_method: "charge_automatically",
            description: "Remaining balance of order",
          });
          await stripe.paymentIntents.update(payment_intent, {
            metadata: { invoice_created: "1" },
          });

          try {
            await fsPromises.writeFile(
              join(__dirname, "Transcript"),
              "Status: invoice created\n",
              { flag: "a+" }
            );
          } catch (error) {
            throw new Error("Transcript error");
          }
          //attempt to pay invoice, if created successfully
          pay_invoice(invoice.id);
        } catch (error4) {
          throw error4;
        }
      }
    } else {
      try {
        await fsPromises.writeFile(
          join(__dirname, "Transcript"),
          "Status: no action, fully refunded\n",
          { flag: "a+" }
        );
      } catch (error1) {
        throw new Error("Transcript error");
      }
    }
  } catch (error5) {
    try {
      await fsPromises.writeFile(
        join(__dirname, "Transcript"),
        "Status: failed\n" + "\tError: " + error5.message + "\n",
        { flag: "a+" }
      );
    } catch (error6) {
      console.log(error6);
    }
  }
  return;
};

const main = async () => {
  // set up file writing to track
  try {
    const date = new Date().toJSON();
    await fsPromises.writeFile(
      join(__dirname, "Transcript"),
      "Transcript for Creating Orders: " + date + "\n",
      { flag: "a+" }
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let start_after: string = "none";

    //function to read line from console
    const read = async () => {
      rl.question("Type how many orders to process: ", async (c) => {
        const count = parseInt(c.trim());
        //if you type '0', script will end
        switch (count) {
          case 0:
            rl.close();
            break;
          default:
            // find all payment intents
            const payment_intents = await get_payment_intents(
              start_after,
              count
            );
            start_after = await payment_intents.data.at(-1).id;
            const payment_list = payment_intents.data.map(
              (pi: Stripe.PaymentIntent, index: number) => {
                return createPromiseFactory(async () => {
                  const i = index + 1;
                  console.log(i + "/" + payment_intents.data.length);
                  if (
                    pi !== null &&
                    pi.status === "succeeded" &&
                    pi.invoice === null
                  ) {
                    await make_stripe_invoice(pi);
                  }
                }, 200);
              }
            );
            await executeSequentially(payment_list);
            await read();
            break;
        }
      });
    };
    await read();
  } catch (err) {
    console.log(err);
  }
};

const get_payment_intents = async (start_after: string, count: number) => {
  if (start_after === "none") {
    return await stripe.paymentIntents.list({
      limit: count,
    });
  } else {
    return await stripe.paymentIntents.list({
      limit: count,
      starting_after: start_after,
    });
  }
};

const pay_invoice = async (invoice_id: string) => {
  //try to charge the invoice
  try {
    await stripe.invoices.pay(invoice_id);
    try {
      await fsPromises.writeFile(
        join(__dirname, "Transcript"),
        "Status: invoice paid\n",
        { flag: "a+" }
      );
    } catch (error) {
      throw new Error("Transcript error");
    }
  } catch (error) {
    try {
      await fsPromises.writeFile(
        join(__dirname, "Transcript"),
        "Status: invoice unpaid\n",
        { flag: "a+" }
      );
    } catch (error) {
      throw new Error("Transcript error");
    }
    throw new Error("Failed to pay invoice");
  }
};
main();
