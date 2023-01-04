import { Application } from "express";
import {
  allAccess,
  getSingleUser,
  createSingleUser,
  updateSingleUser,
} from "../controllers";
import { verifyAccessToken, checkDuplicateEmail } from "../middleware";

export const user = (app: Application) => {
  app.get("/api/all", allAccess);
  app.post("/api/user/create-user", checkDuplicateEmail, createSingleUser);
  app.post("/api/user/update-user", verifyAccessToken, updateSingleUser);
  app.get("/api/user/get-user", verifyAccessToken, getSingleUser);
};
