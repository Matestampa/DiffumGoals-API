const {Router} = require("express");

const router = Router();

const UsersController = require("../controllers/usersControllers.js");

const {authentication} = require("../middlewares/auth.js");
const {normal_response} = require("../middlewares/response.js");

router.post("/register", UsersController.register);

router.post("/login", UsersController.login);

router.post("/logout", authentication, UsersController.logout);

router.get("/isLoggedIn", authentication,(req,res)=>{

    normal_response(res, "User is logged in", {
        user_id: req.user_id,
        username: req.username,
    });
});

const usersRouter = router;

module.exports = usersRouter;