import { Application } from "express";
import { stripeWebhook } from "../controllers/webhooks/stripe.webhook";
import { typeformWebhook } from "../controllers/";
import express from "express";

export const webhook = (app: Application) => {
  app.post("/webhook", express.json(), typeformWebhook);
  app.post(
    "/stripe/hooks",
    express.raw({ type: "application/json" }),
    stripeWebhook
  );
};
