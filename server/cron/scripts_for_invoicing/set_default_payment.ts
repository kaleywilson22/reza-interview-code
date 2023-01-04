import Stripe from "stripe";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../../.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const set_default_pm = async (customer_id: string) => {
  if (customer_id === "") {
    throw new Error("Customer not found");
  }
  const paymentMethods = await stripe.customers.listPaymentMethods(
    customer_id,
    {
      type: "card",
    }
  );
  const pm: Stripe.Customer = await stripe.customers.update(customer_id, {
    invoice_settings: { default_payment_method: paymentMethods.data[0].id },
  });

  if (pm.invoice_settings.default_payment_method === null) {
    throw new Error("Default payment failed to set");
  }
};
