import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Invitation from "../models/invitation.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { errorHandler } from "../utils/error.js";

/**
 * @desc Admin sends invitation to a user
 * @route POST /api/invite/send
 */
export const sendInvitation = async (req, res, next) => {
  try {
    const { email, speciality } = req.body;

    if (!email || !speciality)
      return next(errorHandler(400, "Email and speciality are required."));

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return next(errorHandler(400, "User with this email already exists."));

    const existingInvite = await Invitation.findOne({ email, status: "pending" });
    if (existingInvite)
      return next(errorHandler(400, "An active invitation already exists for this email."));

    const token = jwt.sign({ email, speciality }, process.env.JWT_SECRET_KEY, {
      expiresIn: "2d",
    });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await Invitation.create({
      email,
      speciality,
      invitedBy: req.user.id,
      token,
      expiresAt,
    });

    const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #ddd;padding:20px;border-radius:10px;">
        <h2>You've Been Invited 🎉</h2>
        <p>You have been invited to join <strong>Task Manager</strong> as a <strong>${speciality}</strong>.</p>
        <p>Please click the link below to accept your invitation. This link is valid for 48 hours.</p>
        <a href="${inviteLink}" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#556B2F;color:white;border-radius:5px;text-decoration:none;">Accept Invitation</a>
        <p style="margin-top:20px;color:#777;font-size:12px;">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail(email, "You're invited to Task Manager!", html);

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully.",
      invitation,
    });
  } catch (err) {
    console.error("Error in sendInvitation:", err);
    next(errorHandler(500, "Failed to send invitation."));
  }
};

/**
 * @desc Verify invitation token
 * @route GET /api/invite/verify?token=...
 */
export const verifyInvitation = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return next(errorHandler(400, "Token is required."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const invite = await Invitation.findOne({ email: decoded.email, token });

    if (!invite || invite.status !== "pending")
      return next(errorHandler(400, "Invalid or expired invitation."));

    if (invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();
      return next(errorHandler(400, "Invitation expired."));
    }

    return res.status(200).json({
      success: true,
      invite: {
        email: invite.email,
        speciality: invite.speciality,
      },
    });
  } catch (err) {
    console.error("Error verifying invitation:", err);
    next(errorHandler(400, "Invalid or expired token."));
  }
};

/**
 * @desc Accept invitation (register user)
 * @route POST /api/invite/accept
 */
export const acceptInvitation = async (req, res, next) => {
  try {
    const { token, name, password, profileImage } = req.body;

    if (!token || !name || !password)
      return next(errorHandler(400, "All fields are required."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const invite = await Invitation.findOne({ email: decoded.email, token, status: "pending" });

    if (!invite)
      return next(errorHandler(400, "Invalid or expired invitation."));

    if (invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();
      return next(errorHandler(400, "Invitation expired."));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: decoded.email,
      password: hashedPassword,
      profileImage: profileImage || "",
      role: "user",
    });

    invite.status = "accepted";
    await invite.save();

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user,
    });
  } catch (err) {
    console.error("Error in acceptInvitation:", err);
    next(errorHandler(500, "Failed to accept invitation."));
  }
};

/**
 * @desc Get all invitations (admin only)
 * @route GET /api/invite/all
 */
export const getAllInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find()
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invitations });
  } catch (err) {
    next(errorHandler(500, "Failed to fetch invitations."));
  }
};
