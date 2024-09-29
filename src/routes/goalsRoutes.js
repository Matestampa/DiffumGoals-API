
const express = require("express");

const router = express.Router();

const GoalsController = require("../controllers/goalsControllers.js");


router.post("/new",GoalsController.newGoal);

router.get("/",GoalsController.getGoals);


const goalsRouter=router;

module.exports=goalsRouter;