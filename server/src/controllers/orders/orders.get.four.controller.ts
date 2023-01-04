import { Request } from "express";
import Stripe from "stripe";
import { prisma } from "../../server";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const getOrderDetailFour = async (_req: Request, res: any) => {
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

      const pushItem = async (
        amount: number,
        quantity: number,
        refund: boolean,
        item: Stripe.LineItem,
        product?: Stripe.Product
      ) => {
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
      };

      //create these from the payment_intent / metadata and create product and quantity list
      let products: string[] = [];
      let quantities: number[] = [];
      let refunds: string[] = [];
      let shipping = null;
      let refundAll = false;

      //get the paymentIntent
      const payment_info = await stripe.paymentIntents.retrieve(
        session.payment_intent
      );

      const metadata = await payment_info.metadata;
      await payment_info.charges.data?.map((charge: Stripe.Charge) => {
        if (charge.refunded) {
          refundAll = charge.refunded;
        }
      });

      if (metadata.refund) {
        refunds = refunds
          .concat(metadata.refund.split(","))
          .filter((r) => r !== "");
      }
      if (metadata.product) {
        products = products
          .concat(metadata.product.split(","))
          .filter((prod) => prod !== "");
        quantities = quantities.concat(
          metadata.quantity
            .split(",")
            .filter((quant: string) => quant !== "")
            .map((quant: string) => parseInt(quant))
        );

        if (!refundAll) {
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
          quantities = quantities.filter((quant) => quant !== 0);
        } else {
          refunds = [];
        }

        await Promise.all(
          products.map(async (prod, index) => {
            let description = null;
            let metadata_prod = null;
            let orgItem = false;
            listLineItems.data.forEach((item: Stripe.LineItem) => {
              if (item.price?.product === prod) {
                description = item.description;
                metadata_prod = item.price?.metadata;
                orgItem = true;
                return;
              }
            });
            const product: Stripe.Product = await stripe.products.retrieve(
              prod
            );
            const amount = 7500 * quantities[index];
            const quantity = quantities[index];
            if (!orgItem) {
              description = product.description;
              metadata_prod = product.metadata;
            }
            items.push({
              product: {
                ...product,
                description: description,
                metadata: metadata_prod,
              },
              amount: amount,
              quantity: quantity,
              refund: refundAll,
            });
          })
        );
        await Promise.all(
          refunds.map(async (refund) => {
            let description = null;
            let metadata_prod = null;
            let orgItem = false;
            listLineItems.data.forEach((item: Stripe.LineItem) => {
              if (item.price?.product === refund) {
                description = item.description;
                metadata_prod = item.price?.metadata;
                orgItem = true;
                return;
              }
            });
            const product: Stripe.Product = await stripe.products.retrieve(
              refund
            );
            const amount = 7500;
            const quantity = 1;
            if (!orgItem) {
              description = product.description;
              metadata_prod = product.metadata;
            }
            items.push({
              product: {
                ...product,
                description: description,
                metadata: metadata_prod,
              },
              amount: amount,
              quantity: quantity,
              refund: true,
            });
          })
        );
      } else {
        //if there are no updates within the payment intent
        const promises = listLineItems.data.map(
          async (item: Stripe.LineItem) => {
            //check for refund metadata
            let isRefund = refundAll;
            let total_quant = item.quantity ? item.quantity : 0;
            const product: Stripe.Product = await stripe.products.retrieve(
              item.price?.product
            );

            if (refunds.length !== 0 && !isRefund) {
              let refundItem = false;
              await Promise.all(
                refunds.map(async (refund) => {
                  if (refund === item.price?.product) {
                    refundItem = true;
                    pushItem(7500, 1, true, item, product);
                    total_quant -= 1;
                  }
                })
              );

              if (refundItem) {
                refunds.filter((refund) => refund !== item.price?.product);
              }
            }

            pushItem(7500 * total_quant, total_quant, refundAll, item, product);
          }
        );
        await Promise.all(promises);
      }
      //check for shipping updates
      if (metadata.line1) {
        shipping = {
          name: metadata.name,
          city: metadata.city,
          line1: metadata.line1,
          ...(metadata.line2 ? { line2: metadata.line2 } : {}),
          state: metadata.state,
          postal_code: metadata.postal_code,
        };
      }

      details.push({
        pi: session,
        items: items,
        shipping: shipping,
        hoodie_id: metadata.bc_order_id,
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
