import { Application } from "express";

import {
  generateInviteLink,
  getInviteLink,
  addInviteToWaitlist,
} from "../controllers";
import { verifyAccessToken } from "../middleware";

export const invite = (app: Application) => {
  app.post(
    "/api/invite/generate-invite",
    verifyAccessToken,
    generateInviteLink
  );
  app.get("/api/invite/get-invite", getInviteLink);
  app.post("/api/invite/add-invite", addInviteToWaitlist);
};
