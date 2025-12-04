import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const getUsers = async (req, res, next) => {
  try {
    // const users = await User.find({ role: "user" }).select("-password").lean();
    const users = await User.find({ role: "user" }).select("-password");
    const userTaskCounts = await Promise.all(
      users.map(async (user) => {
        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });

        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });
        const completedTask = await Task.countDocuments({
          assignedTo: user._id,
          status: "completed",
        });
        return {
          ...user._doc,
          pendingTasks,
          inProgressTasks,
          completedTask,
        };
      })
    );
    return res.status(200).json(userTaskCounts);
  } catch (error) {
    next(errorHandler(500, error.message));
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return next(errorHandler(404, "User Not Found..!"));
    }
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
    next(errorHandler(500, error.message));
  }
};
