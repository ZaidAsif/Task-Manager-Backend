import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import excelJs from "exceljs";
import { errorHandler } from "../utils/error.js";

/**
 * 📊 EXPORT TASK REPORT
 * Generates Excel of all tasks with assignees & metadata
 */
export const exportTaskReport = async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate("assignedTo", "name email")
      .lean();

    const workbook = new excelJs.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");

    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 35 },
    ];

    // Add rows
    tasks.forEach((task) => {
      const assignedUsers = Array.isArray(task.assignedTo)
        ? task.assignedTo.map((u) => `${u.name} (${u.email})`).join(", ")
        : task.assignedTo?.name
        ? `${task.assignedTo.name} (${task.assignedTo.email})`
        : "Unassigned";

      worksheet.addRow({
        _id: task._id.toString(),
        title: task.title,
        description: task.description || "-",
        priority: task.priority || "Normal",
        status: task.status || "Pending",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "-",
        assignedTo: assignedUsers,
      });
    });

    // Style header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF556B2F" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tasks_report_${timestamp}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export Task Report Error:", error.message);
    return next(errorHandler(500, "Failed to generate task report"));
  }
};

/**
 * 👥 EXPORT USER REPORT
 * Generates Excel of users with task counts & statuses
 */
export const exportUsersReport = async (req, res, next) => {
  try {
    const users = await User.find().select("name email _id").lean();
    const tasks = await Task.find().populate("assignedTo", "_id").lean();

    const userStats = {};

    // Initialize map
    users.forEach((u) => {
      userStats[u._id] = {
        name: u.name,
        email: u.email,
        totalTasks: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
      };
    });

    // Aggregate task data
    tasks.forEach((t) => {
      if (!t.assignedTo) return;
      const assignedUsers = Array.isArray(t.assignedTo)
        ? t.assignedTo
        : [t.assignedTo];
      assignedUsers.forEach((u) => {
        if (userStats[u._id]) {
          userStats[u._id].totalTasks++;
          if (t.status === "Pending") userStats[u._id].pending++;
          else if (t.status === "In Progress") userStats[u._id].inProgress++;
          else if (t.status === "Completed") userStats[u._id].completed++;
        }
      });
    });

    // Create Excel
    const workbook = new excelJs.Workbook();
    const worksheet = workbook.addWorksheet("User Task Report");

    worksheet.columns = [
      { header: "User Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 35 },
      { header: "Total Tasks", key: "totalTasks", width: 15 },
      { header: "Pending", key: "pending", width: 15 },
      { header: "In Progress", key: "inProgress", width: 15 },
      { header: "Completed", key: "completed", width: 15 },
      { header: "Completion Rate (%)", key: "completionRate", width: 20 },
    ];

    // Add rows
    Object.values(userStats).forEach((u) => {
      const completionRate =
        u.totalTasks === 0
          ? "0%"
          : ((u.completed / u.totalTasks) * 100).toFixed(1) + "%";
      worksheet.addRow({ ...u, completionRate });
    });

    // Header styling
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF556B2F" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users_report_${timestamp}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export User Report Error:", error.message);
    return next(errorHandler(500, "Failed to generate users report"));
  }
};
