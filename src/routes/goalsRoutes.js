
import express from "express";

const router=express.Router();

import GoalsController from "../controllers/goalsControllers.js";


router.post("/upload",GoalsController.uploadGoal);

router.get("/",GoalsController.getGoals);


const goalsRouter=router;

export default goalsRouter;