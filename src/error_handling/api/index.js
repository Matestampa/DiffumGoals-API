//------------ IMPORT HANDLER & GENERAL ERRORS ----------------
const { apiError_handler } = require("./handler.js");
const { Error4User, DEFLT_API_ERRORS } = require("./general_errors.js");

//----------- IMPORT SPECIFIC ERRORS ------------------------
//const {FOLLOWERS_ERRORS}=require("./followers_errors.js");

module.exports= {apiError_handler,Error4User,DEFLT_API_ERRORS};