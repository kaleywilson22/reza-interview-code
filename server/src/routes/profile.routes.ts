import { Application } from "express";
import {
  createProfile,
  updateProfile,
  getSingleProfile,
  deleteSinglePicture,
  uploadPhotosToGallery,
  getAllProfiles,
  getSingleProfileById,
} from "../controllers";
import { upload } from "../utils";
import { verifyAccessToken } from "../middleware";

const profile_uploader = upload.fields([
  {
    name: "profile",
    maxCount: 1,
  },
  {
    name: "gallery",
    maxCount: 12,
  },
]);

export const profile = (app: Application) => {
  app.post(
    "/api/profile/create-profile",
    verifyAccessToken,
    profile_uploader,
    createProfile
  );
  app.post(
    "/api/profile/update-profile",
    verifyAccessToken,
    profile_uploader,
    updateProfile
  );

  app.get("/api/profile/get-profile", verifyAccessToken, getSingleProfile);
  app.get('/api/profile/get-profile-id/:id',verifyAccessToken, getSingleProfileById);

  app.get("/api/profile/get-all-profiles",verifyAccessToken,  getAllProfiles);

  app.delete(
    "/api/profile/delete-photo",
    verifyAccessToken,
    deleteSinglePicture
  );
  app.post(
    "/api/profile/upload-photos",
    verifyAccessToken,
    profile_uploader,
    uploadPhotosToGallery
  );
};
