import axios from "axios";
import Stripe from "stripe";
import * as dotenv from "dotenv";
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
export const create_BC_order = async (
  pi: Stripe.PaymentIntent,
  customer_id: string
) => {
  //find customer
  const payment_intent = pi.id;

  //find metadata
  const metadata = pi.metadata;
  let products: string[] = [];
  let quantities: number[] = [];
  let refunds: string[] = [];
  let total = 0;
  let shipping_local = true;
  let total_quantity = 0;

  //check to see if a big commerce order has already been created
  if (!metadata.hasOwnProperty("bc_created")) {
    //check for refund
    if (metadata.hasOwnProperty("refund")) {
      refunds = metadata.refund
        .split(",")
        .filter((r: string) => r !== "")
        .map((r) => r.trim());
    }
    //save total metadata
    if (metadata.hasOwnProperty("total")) {
      total = parseInt(metadata.total);
    }
    //save shipping local
    if (metadata.hasOwnProperty("isLocal")) {
      shipping_local = metadata.isLocal.trim() === "true";
    }
    //get shoe information if there were changes to order
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
      //find checkout session
      const session_list = await stripe.checkout.sessions.list({
        payment_intent: payment_intent,
      });
      const session = await session_list.data[0];

      //if there are no changes to order, use session line items
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
    const customer = await stripe.customers.retrieve(customer_id);
    let shipping_address = customer.shipping.address;
    shipping_address.email = customer.email;
    shipping_address.name = customer.name;
    let billing_address = customer.address;
    billing_address.email = customer.email;
    billing_address.name = customer.name;

    //define
    let per_shoe = 200;
    if (total_quantity * 275 !== total) {
      per_shoe = 145;
    }

    const status = await helper(
      products,
      quantities,
      per_shoe,
      shipping_address,
      shipping_local,
      billing_address
    );

    if (status === 201) {
      await stripe.paymentIntents.update(payment_intent, {
        metadata: { bc_created: "1" },
      });
    }
  }
};

const helper = async (
  products_stripe: string[],
  quantities_stripe: number[],
  per_shoe: number,
  shipping_stripe: any,
  local_shipping: boolean,
  billing_stripe: any
) => {
  //create products
  const products = products_stripe.map((p: string, index) => {
    const prod = {
      product_id: BC_SHOE_ID,
      name: variants[p],
      name_merchant: variants[p],
      variant_id: p,
      quantity: quantities_stripe[index],
    };
    return prod;
  });
  const billing_address = {
    first_name: billing_stripe.name,
    street_1: billing_stripe.line1,
    street_2: billing_stripe.line2 !== null ? billing_stripe.line2 : "",
    city: billing_stripe.city,
    state: billing_stripe.state,
    zip: billing_stripe.postal_code,
    country_iso2: billing_stripe.country,
    email: billing_stripe.email,
  };
  const shipping_address = {
    first_name: shipping_stripe.name,
    street_1: shipping_stripe.line1,
    street_2: shipping_stripe.line2 !== null ? shipping_stripe.line2 : "",
    city: shipping_stripe.city,
    state: shipping_stripe.state,
    zip: shipping_stripe.postal_code,
    country_iso2: shipping_stripe.country,
    email: shipping_stripe.email,
  };

  const total_quant = quantities_stripe.reduce((sum, q) => sum + q, 0);
  let discount = 75 * total_quant;
  let shipping_cost = 0;
  if (per_shoe !== 200) {
    discount += 55 * total_quant;
  }
  if (!local_shipping) {
    shipping_cost = 40;
  }

  const data = await axios.post(
    `${API_URL}orders`,
    {
      products: products,
      billing_address: billing_address,
      shipping_addresses: [shipping_address],
      discount_amount: discount,
      shipping_cost_inc_tax: shipping_cost,
    },
    {
      headers: {
        "X-Auth-Token": process.env.BIGCOMMERCE_STORE_API_TOKEN!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  return data.status;
};

enum variants {
  "REZA-1-6M/6.5W-WH" = 107,
  "REZA-1-7M/8.5W-WH" = 109,
  "REZA-1-8M/9.5W-WH" = 111,
  "REZA-1-9M/10.5W-WH" = 113,
  "REZA-1-10M/11.5W-WH" = 115,
  "REZA-1-11M/12.5W-WH" = 117,
  "REZA-1-12M/13.5W-WH" = 119,
  "REZA-1-13M/14.5W-WH" = 121,
  "REZA-1-14M/15.5W-WH" = 123,
  "REZA-1-15M/16.5W-WH" = 125,
  "REZA-1-6M/6.5W-BL" = 126,
  "REZA-1-7M/8.5W-BL" = 127,
  "REZA-1-8M/9.5W-BL" = 128,
  "REZA-1-9M/10.5W-BL" = 129,
  "REZA-1-10M/11.5W-BL" = 130,
  "REZA-1-11M/12.5W-BL" = 131,
  "REZA-1-12M/13.5W-BL" = 132,
  "REZA-1-13M/14.5W-BL" = 133,
  "REZA-1-14M/15.5W-BL" = 134,
  "REZA-1-15M/16.5W-BL" = 135,
}
