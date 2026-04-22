const {apiError_handler} = require("../error_handling");
const {normal_response} = require("../middlewares/response.js");
const {validate_register_login} = require("../api/users/validator.js");

const {register_Service, login_Service} = require("../api/users/service/usersService.js");

const {AUTH_VARS, GOOGLE_OAUTH_VARS} = require("../config/app_config.js");



function googleAuthCallback(req, res) {
    const userData = req.oauth_user;
    res.cookie(AUTH_VARS.JWT_COOKIE_NAME, userData.token, {
        httpOnly: true,
        secure: AUTH_VARS.JWT_COOKIE_SECURE,
        sameSite: "none",
        maxAge: AUTH_VARS.JWT_EXPIRATION_MS
    });
    res.redirect(GOOGLE_OAUTH_VARS.FRONTEND_URL);
}


async function logout(req, res) {

    res.clearCookie(AUTH_VARS.JWT_COOKIE_NAME, {
        httpOnly: true,
        secure: AUTH_VARS.JWT_COOKIE_SECURE,
        sameSite: "none"
    });

    normal_response(res, "User logged out successfully");
}

const UsersController = {
    logout,
    googleAuthCallback
}

module.exports = UsersController;