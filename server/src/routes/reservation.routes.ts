import { Application } from "express";
import { getReservation, unlockReservation } from "../controllers/reservation";

import { verifyAccessToken } from "../middleware";

export const reservation = (app: Application) => {
  app.get(
    "/api/reservation/get-reservation",
    verifyAccessToken,
    getReservation
  );
  app.post("/api/reservation/unlock", verifyAccessToken, unlockReservation);
};
