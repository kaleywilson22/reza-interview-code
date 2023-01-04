import { Application } from "express";
import {
  addToWaitList,
  getWaitlistRecord,
  verifyWaitlistEmail,
} from "../controllers";

export const waitlist = (app: Application) => {
  app.post("/api/waitlist", addToWaitList);
  app.post("/api/waitlist/get-record", getWaitlistRecord);
  app.post("/api/waitlist/verify-email", verifyWaitlistEmail);
};
