import express from "express";
import {
  sendInvitation,
  verifyInvitation,
  acceptInvitation,
  getAllInvitations,
} from "../controllers/invite.controller.js";
import { verification, adminOnly } from "../utils/authentication.js";

const router = express.Router();

router.post("/send", verification, adminOnly, sendInvitation);
router.get("/verify", verifyInvitation);
router.post("/accept", acceptInvitation);
router.get("/all", verification, adminOnly, getAllInvitations);

export default router;
