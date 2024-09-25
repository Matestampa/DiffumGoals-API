import {AwsService_TimeOut_Error,
    AwsService_Unavailable_Error,
    AwsService_Unknown_Error} from "./error_handler.js";


import S3_FUNCS from "./s3.js";

const AWS_GEN_ERRORS={
    AwsService_TimeOut_Error,
    AwsService_Unavailable_Error,
    AwsService_Unknown_Error
}

export {
    S3_FUNCS,
    AWS_GEN_ERRORS
};