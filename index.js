import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDB } from "./utils/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import taskRoutes from "./routes/task.route.js";
import reportRoutes from "./routes/report.route.js";
import inviteRoutes from "./routes/invite.route.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use(morgan("dev"));
connectDB();

app.use("/api/invite", inviteRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use('/uploads', express.static('uploads'));

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error!!";
  res.status(statusCode).json({
    message,
    success: false,
  });
});
app.listen(PORT, () => {
  console.log(` app listening on port ${PORT}`);
});
