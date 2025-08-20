const { apiError_handler, Error4User, DEFLT_API_ERRORS } = require("./api");
const { internalError_handler, InternalError, GEN_INT_ERRORS } = require("./internal");


module.exports= {apiError_handler,DEFLT_API_ERRORS,
                internalError_handler,InternalError,GEN_INT_ERRORS};