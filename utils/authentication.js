import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";
export const verification = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
   return next(errorHandler(401, "User not Authorized"));
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
     return next(errorHandler(401, "User not Authorized"));
    }
    req.user = user;
    next();
  });
};

export const adminOnly = (req, res, next) => {
  try {
    if (req.user?.role === "admin") {
      
     return next();
    }
     return next(errorHandler(403, "Access denied..!")); 
  } catch (error) {
    return next(errorHandler(500, error.message));
  }
};
