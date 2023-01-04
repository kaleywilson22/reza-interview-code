import { Application } from "express";
import {
  getLocation,
  updateUserLocation,
  createLocation,
  getAllLocation,
  getAllLocationProfile,
} from "../controllers";
import { verifyAccessToken } from "../middleware";

export const location = (app: Application) => {
  app.post("/api/location/update", verifyAccessToken, updateUserLocation);
  app.get("/api/location/get", verifyAccessToken, getLocation);
  app.get("/api/location/getAll", verifyAccessToken, getAllLocation);
  app.post("/api/location/create", verifyAccessToken, createLocation);
  app.get(
    "/api/location/getAllProfile",
    verifyAccessToken,
    getAllLocationProfile
  );
};
