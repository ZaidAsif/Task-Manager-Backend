import mongoose from "mongoose";
import Task from "../models/task.model.js";
import { errorHandler } from "../utils/error.js";

export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;
    const adminId = req.user.id;
    if (!Array.isArray(assignedTo)) {
      return next(errorHandler(400, "assignedTo must be array..!"));
    }
    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
      createdBy: adminId,
    });
    return res.status(201).json({
      message: "Task Created Successfully..!",
      success: true,
      task,
    });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};
export const getTasks = async (req, res, next) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }
    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find(filter).populate(
        "assignedTo",
        "name email profileImage"
      );
    } else {
      tasks = await Task.find({
        ...filter,
        assignedTo: req.user.id,
      }).populate("assignedTo", "name email profileImageUrl");
    }

    // complete task counted
    tasks = await Promise.all(
      tasks.map(async (task) => {
        const completedCount = task.todoChecklist.filter(
          (item) => item.completed
        ).length;

        return { ...task._doc, completedCount: completedCount };
      })
    );

    // status summary count

    const allTasks = await Task.countDocuments(
      req.user.role === "admin" ? {} : { assignedTo: req.user.id }
    );

    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "Pending",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    });

    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "In Progress",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    });

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "Completed",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    });

    res.status(200).json({
      tasks,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email ProfileImage"
    );
    if (!task) {
      return next(errorHandler(404, "Task Not Found..!"));
    }
    return res.status(200).json(task);
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return next(errorHandler(404, "Task Not Found..!"));
    }

    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
    task.attachments = req.body.attachments || task.attachments;
    const { assignedTo } = req.body;
    if (assignedTo) {
      if (!Array.isArray(assignedTo)) {
        return next(errorHandler(400, "AssignedTo Is Not Array..!"));
      }
    }
    task.assignedTo = req.body.assignedTo || task.assignedTo;
    const updatedTask = await task.save();
    return res.status(200).json({
      message: "Task Updated Successfully..!",
      updatedTask,
    });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(errorHandler(404, "Task not found!"));
    }

    await task.deleteOne();

    res.status(200).json({ message: "Task deleted successfully!" });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};
export const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(errorHandler(404, "Task not found!"));
    }
    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user.id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return next(errorHandler(403, "User Unauthorized"));
    }

    task.status = req.body.status || task.status;

    if (task.status === "Completed") {
      task.todoChecklist.forEach((item) => (item.completed = true));
    }

    await task.save();

    res.status(200).json({ message: "Task status updated", task });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error));
  }
};
export const updateTaskChecklist = async (req, res, next) => {
  try {
    const { todoChecklist } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(errorHandler(404, "Task not found!"));
    }

    if (!task.assignedTo.includes(req.user.id) && req.user.role !== "admin") {
      return next(errorHandler(403, "Not authorized can't update checklist"));
    }

    task.todoChecklist = todoChecklist;

    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length;

    const totalItems = task.todoChecklist.length;

    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }

    await task.save();

    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImage"
    );

    res
      .status(200)
      .json({ message: "Task checklist updated", task: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const getDashboardData = async (req, res, next) => {
  try {
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" }, // not equal to Completed
      dueDate: { $lt: new Date() }, // less than new Date
    });

    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");

      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;

      return acc;
    }, {});

    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];

    const taskPriorityLevelRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevel = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0;

      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevel,
      },

      recentTasks,
    });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};

export const userDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // console.log(typeof userId); string
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
  //  console.log(userObjectId instanceof mongoose.Types.ObjectId); object

    
    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const pendingTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Pending",
    });
    const completedTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task distribution by status
    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistributionRaw = await Task.aggregate([
      {
        $match: { assignedTo: userObjectId },
      },
      {
        $group: { _id: "$status", count: { $sum: 1 } },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");

      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;

      return acc;
    }, {});

    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];

    const taskPriorityLevelRaw = await Task.aggregate([
      { $match: { assignedTo: userObjectId } },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorityLevel = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0;

      return acc;
    }, {});

    const recentTasks = await Task.find({ assignedTo: userObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevel,
      },
      recentTasks,
    });
  } catch (error) {
    console.log(error.message);
    return next(errorHandler(500, error.message));
  }
};
