import { Application } from "express";
import {
  getOrderDetail,
  getOrderDetailFour,
  getOrderDetailThree,
  getOrderDetailTwo,
  updateOrder,
  updateShipping,
  createSingleOrder,
  getBigCommerceOrder,
  updateBigCommerceOrder,
  getAllOrderTwo,
} from "../controllers";

import { verifyAccessToken } from "../middleware";

export const order = (app: Application) => {
  app.get("/api/order", verifyAccessToken, getOrderDetail);
  app.get("/api/v2/order", verifyAccessToken, getOrderDetailTwo);
  app.get("/api/v2/orderList", getAllOrderTwo);
  app.put("/api/order/update", verifyAccessToken, updateOrder);
  app.get("/api/v3/order", verifyAccessToken, getOrderDetailThree);
  app.post("/api/order/create", verifyAccessToken, createSingleOrder);
  app.get("/api/v4/order", verifyAccessToken, getOrderDetailFour);
  app.get(
    "/api/order/big_commerce/:id",
    verifyAccessToken,
    getBigCommerceOrder
  );
  app.put(
    "/api/order/big_commerce/update/:id",
    verifyAccessToken,
    updateBigCommerceOrder
  );
  app.put("/api/order/updateshipping", verifyAccessToken, updateShipping);
};
