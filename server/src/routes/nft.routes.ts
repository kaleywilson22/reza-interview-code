import { Application } from "express";
import { getNFT, updateNFT, updateNFTV2 } from "../controllers";
import { verifyAccessToken } from "../middleware";

export const nft = (app: Application) => {
  app.post("/api/nft/update-nft", verifyAccessToken, updateNFT);
  app.post("/api/nft/v2/update-nft", verifyAccessToken, updateNFTV2);
  app.get("/api/nft", verifyAccessToken, getNFT);
};
