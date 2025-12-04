import express from "express"
import { exportTaskReport, exportUsersReport } from "../controllers/report.controller.js"
import { adminOnly, verification } from "../utils/authentication.js"

const router = express.Router()
router.get("/export/tasks",verification,adminOnly,exportTaskReport)
router.get("/export/users",verification,adminOnly,exportUsersReport)




export default router