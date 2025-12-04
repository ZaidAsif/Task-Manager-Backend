import express from "express"
import { getUserById, getUsers } from "../controllers/user.controller.js"
import { adminOnly, verification } from "../utils/authentication.js"

const router = express.Router()

router.get("/get-users",verification,adminOnly,getUsers)
router.get("/:id",verification,getUserById)



export default router