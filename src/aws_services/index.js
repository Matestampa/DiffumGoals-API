const { AwsService_Error,AwsService_TimeOut_Error, 
    AwsService_Unavailable_Error, AwsService_Unknown_Error } = require("./error_handler.js");

const S3_FUNCS = require("./s3.js");

const CLOUDFRONT= require("./cloudfront.js");

const AWS_GEN_ERRORS={
    AwsService_Error,
    AwsService_TimeOut_Error,
    AwsService_Unavailable_Error,
    AwsService_Unknown_Error
}

module.exports= {
    S3_FUNCS,
    CLOUDFRONT,
    AWS_GEN_ERRORS
};