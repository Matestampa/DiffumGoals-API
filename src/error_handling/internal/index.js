//------------ IMPORT HANDLER & GENERAL ERRORS ----------------
const { internalError_handler } = require("./handler.js");
const { InternalError, GEN_INT_ERRORS } = require("./general_errors.js");


module.exports= {internalError_handler,InternalError,GEN_INT_ERRORS};