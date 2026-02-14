
const express = require("express");

const router = express.Router();

const multer = require("multer");

const GoalsController = require("../controllers/goalsControllers.js");

const {apiError_handler,DEFLT_API_ERRORS} = require("../error_handling")

const {authentication} = require("../middlewares/auth.js");

//----Config of multer middleware to upload imgs -------
const storage = multer.memoryStorage();

const upload = multer({storage: storage});
//-----------------------------------------------------

router.post("/new",upload.single("img"),authentication,GoalsController.newGoal);

// ERROR HANDLER para Multer (por si no se manda el nombre del field)
router.use(function (err, req, res, next) {
    if (err instanceof multer.MulterError) {
        apiError_handler(DEFLT_API_ERRORS.BAD_REQ("Multer Error: " + err.message), res);
        return;
    }
});

router.get("/all",GoalsController.getGoals);

router.get("/:id/originalImage", GoalsController.getGoal_originalImage);

const goalsRouter=router;

module.exports=goalsRouter;