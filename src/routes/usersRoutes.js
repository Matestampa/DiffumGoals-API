const {Router} = require("express");

const router = Router();

const UsersController = require("../controllers/usersControllers.js");

const {authentication} = require("../middlewares/auth.js");
const {normal_response} = require("../middlewares/response.js");
const passport = require("../config/passport_config.js");
const {GOOGLE_OAUTH_VARS} = require("../config/app_config.js");


// ---------- Google OAuth ----------

router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get("/auth/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, (err, userData) => {
            if (err || !userData) {
                return res.redirect(`${GOOGLE_OAUTH_VARS.FRONTEND_URL}?error=oauth_failed`);
            }
            req.oauth_user = userData;
            next();
        })(req, res, next);
    },
    UsersController.googleAuthCallback
);



router.post("/logout", authentication, UsersController.logout);

router.get("/isLoggedIn", authentication,(req,res)=>{

    normal_response(res, "User is logged in", {
        user_id: req.user_id,
        username: req.username,
    });
});

const usersRouter = router;

module.exports = usersRouter;