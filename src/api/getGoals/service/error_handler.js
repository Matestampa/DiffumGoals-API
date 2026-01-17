
const {Error} = require("mongoose");
const {MongoDB_Error} = require("../../../db/mongodb");

const {GEN_INT_ERRORS, internalError_handler} = require("../../../error_handling");
const {DEFLT_API_ERRORS} = require("../../../error_handling");

const {AWS_GEN_ERRORS} = require("../../../aws_services");


async function getGoals_errorHandler(error){
    if (error instanceof AWS_GEN_ERRORS.AwsService_Error){ //error from AWS
        internalError_handler(error);
    }
    
    if (error instanceof Error){ //error from Mongoose
        internalError_handler(new MongoDB_Error(error));
    }

    if (error==="NOT_FOUND"){
        return DEFLT_API_ERRORS.BAD_REQ("Not found");
    }

    else{
        internalError_handler(GEN_INT_ERRORS.UNKNOWN("",error)); //unknow error
    }
    
    return DEFLT_API_ERRORS.SERVER(); //always return server error
}

module.exports = {getGoals_errorHandler} 