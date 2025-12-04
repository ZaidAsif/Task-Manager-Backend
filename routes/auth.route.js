import express from "express";
import {
  loginController,
  registerController,
  updateProfile,
  uploadImage,
  userProfile,
} from "../controllers/auth.controller.js";
import { verification } from "../utils/authentication.js";
import upload from "../utils/multer.js";
const router = express.Router();
// user
router.post("/register", registerController);
router.post("/login", loginController);
router.get("/profile", verification, userProfile);
router.put("/profile-update", verification, updateProfile);
router.post("/upload-image",upload.single("image") , uploadImage);

export default router;
