import { Application } from "express";
import { checkMagicLink } from "../middleware/magic.link.verify";
import {
  signInApp,
  signInWeb,
  generateCode,
  refreshApp,
  refreshWeb,
  logout,
  isAuthenticated,
  getCodeWeb,
  updateEmail,
  getCodeWeb_UpdateEmail,
} from "../controllers";

import {
  verifyUser,
  verifyRefreshTokenApp,
  verifyAccessToken,
  verifyRefreshTokenWeb,
} from "../middleware";

export const auth = (app: Application) => {
  //common
  app.post("/api/auth/generate-code", verifyUser, generateCode);
  app.post(
    "/api/auth/generate-code-update-email",
    verifyAccessToken,
    getCodeWeb_UpdateEmail
  );

  //Routes for the App
  app.post("/api/auth/sign-in-app", verifyUser, signInApp);
  app.get("/api/auth/refresh-app", verifyRefreshTokenApp, refreshApp);

  //Routes for the website
  app.post("/api/auth/code", getCodeWeb);
  app.post("/api/auth/sign-in", verifyUser, signInWeb);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/refresh", verifyRefreshTokenWeb, refreshWeb);
  app.get(
    "/api/auth/portal",
    verifyAccessToken,
    checkMagicLink,
    isAuthenticated
  );
  app.post("/api/auth/update-email", verifyAccessToken, updateEmail);
};
