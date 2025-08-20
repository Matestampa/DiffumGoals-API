
const express = require("express");

const router = express.Router();

const multer = require("multer");

const GoalsController = require("../controllers/goalsControllers.js");

//----Config of multer middleware to upload imgs -------
const storage = multer.memoryStorage();

const upload = multer({storage: storage});
//-----------------------------------------------------

router.post("/new",upload.single("img"),GoalsController.newGoal);

router.get("/all",GoalsController.getGoals);


const goalsRouter=router;

module.exports=goalsRouter;