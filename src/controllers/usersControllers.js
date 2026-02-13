const {apiError_handler} = require("../error_handling");
const {normal_response} = require("../middlewares/response.js");
const {validate_register_login} = require("../api/users/validator.js");

const {register_Service, login_Service} = require("../api/users/service/usersService.js");

const {AUTH_VARS} = require("../config/app_config.js");

async function register(req, res) {
    
    let error;

    // Validate data
    ({ error } = validate_register_login(req.body));

    if (error) {apiError_handler(error, res); return;}

    ({error, data} = await register_Service(req.body.username, req.body.password));

    if (error) {apiError_handler(error, res); return;}

    normal_response(res, "User registered successfully", {
        user_id: data.user_id,
        username: data.username
    });
}

async function login(req, res) {
    let error;

    // Validate data
    ({ error } = validate_register_login(req.body));

    if (error) {apiError_handler(error, res); return;}

    ({error, data} = await login_Service(req.body.username, req.body.password));

    if (error) {apiError_handler(error, res); return;}

    //Set token cookie
    res.cookie(AUTH_VARS.JWT_COOKIE_NAME, data.token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: AUTH_VARS.JWT_EXPIRATION_MS
    });

    normal_response(res, "User logged in successfully", {
        user_id: data.user_id,
        username: data.username
    });
}


async function logout(req, res) {

    res.clearCookie("token");

    normal_response(res, "User logged out successfully");
}

const UsersController = {
    register,
    login,
    logout
}

module.exports = UsersController;