import { Request, Response } from "express";
import { __prod__ } from "../../constants";
import { Stripe } from "stripe";
import { prisma } from "../../server";
import { sendMailjetEmail, template_ids } from "../../utils";
import { create_BC_order } from "../../../cron/scripts_for_invoicing/create_bc_order";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret: string = process.env.STRIPE_WEBHOOK_KEY;

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    if (__prod__) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      const payloadString = req.body;

      const header = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: endpointSecret,
      });

      event = stripe.webhooks.constructEvent(
        payloadString,
        header,
        endpointSecret
      );
    }
  } catch (err) {
    console.log(`Error message: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  switch (event.type) {
    case "checkout.session.completed":
      const data = event.data.object as Stripe.Checkout.Session;
      const customer = await stripe.customers.retrieve(data.customer);
      const user_id = data?.metadata?.id
        ? parseInt(data.metadata.id!)
        : undefined;

      const user = await prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          stripe_id: customer.id,
        },
      });

      await prisma.reservation.update({
        where: {
          user_id: user_id,
        },
        data: {
          completed_reservation: true,
        },
      });

      const first_name = user?.first_name?.split(" ")[0];
      const mail_name = first_name
        ? `${first_name[0].toUpperCase() + first_name.substring(1)}`
        : undefined;

      await sendMailjetEmail(
        customer?.email.toLowerCase()!,
        template_ids.after_buy,
        {
          name: mail_name || "",
        }
      );
      await sendMailjetEmail(
        customer?.email.toLowerCase()!,
        template_ids.high_volume
      );
    // case of a invoice payment failed
    case "invoice.payment_failed":
      const data_in = event.data.object as Stripe.Invoice;
      //send invoice manually for payment: will send using email on file for customer on stripe
      await stripe.invoices.sendInvoice(data_in.id);

    //case of a payment intent succeed via an invoice; where invoice != null
    case "invoice.payment_succeeded":
      const data_in_2 = event.data.object as Stripe.Invoice;
      const pi: Stripe.PaymentIntent = await stripe.paymentIntents.retrieve(
        data_in_2.payment_intent
      );
      const md = pi.metadata;
      if (md.hasOwnProperty("invoice_created")) {
        if (parseInt(md.invoice_created) === 1) {
          create_BC_order(pi, data_in_2.customer.toString());
        }
      }
  }
  res.json({ received: true });
};
