import { Application } from "express";
import { getVersion } from "../controllers";

export const version = (app: Application) => {
  app.get("/api/version", getVersion);
};
