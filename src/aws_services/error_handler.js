const { InternalError } = require("../error_handling");


//MUST be called with the direct error from AWS, and the service name which
//triggered the error (S3, LAMBDA,etc)
function aws_errorHandler(error,service){

    if (error.name="TimeoutError"){
        throw new AwsService_TimeOut_Error("",null,service);
    }

    else if (error.name="ServiceUnavailable"){
        throw new AwsService_Unavailable_Error("",null,service);
    }

    else{
        throw new AwsService_Unknown_Error("",error,service);
    }

}


class AwsService_TimeOut_Error extends InternalError{
    constructor(message,attachedError,service){
        super(message,attachedError);
        this.name="AwsService_TimeOut_Error";
        this.critic=true;
        this.service=service;
    }
}

class AwsService_Unavailable_Error extends InternalError{
    constructor(message,attachedError,service){
        super(message,attachedError);
        this.name="AwsService_Unavailable_Error";
        this.critic=true;
        this.service=service;
    }
}

class AwsService_Unknown_Error extends InternalError{
    constructor(message,attachedError,service){
        super(message,attachedError);
        this.name="AwsService_Unknown_Error";
        this.critic=true;
        this.service=service;
    }
}

module.exports= {aws_errorHandler,
    AwsService_TimeOut_Error,
    AwsService_Unavailable_Error,
    AwsService_Unknown_Error
}