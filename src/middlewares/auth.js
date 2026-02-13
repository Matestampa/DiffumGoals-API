const jwt = require('jsonwebtoken');

const {apiError_handler,DEFLT_API_ERRORS} = require("../error_handling");

const {AUTH_VARS} = require("../config/app_config.js");

function authentication(req,res,next){

    const token = req.cookies[AUTH_VARS.JWT_COOKIE_NAME];

    if (!token) {
        apiError_handler(DEFLT_API_ERRORS.NOT_AUTH(),res);return;
    }

    try {
        const decoded = jwt.verify(token, AUTH_VARS.JWT_SECRET);
        req.user_id = decoded.user_id;
        req.username = decoded.username;
        next();
    } 
    catch (error) {
        apiError_handler(DEFLT_API_ERRORS.NOT_AUTH(),res);return;
    
    }
}

module.exports={authentication};