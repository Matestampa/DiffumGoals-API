const { InternalError } = require("../error_handling");


//MUST be called with the direct error from AWS, and the service name which
//triggered the error (S3, LAMBDA,etc)
function aws_errorHandler(error,service){
    if (error.name=="TimeoutError"){
        throw new AwsService_TimeOut_Error("",error,service);
    }

    else if (error.name=="ServiceUnavailable"){
        throw new AwsService_Unavailable_Error("",error,service);
    }

    else{
        throw new AwsService_Unknown_Error("",error,service);
    }

}

//--------- GENERAL AWS ERROR --------------
class AwsService_Error extends InternalError{
    constructor(message,attachedError,service){
        super(message,attachedError,service);
        this.name="";
        this.critic=true;
        this.service=service;
    }
}

//------------ CHILD CLASSES --------------------

class AwsService_TimeOut_Error extends AwsService_Error{
    constructor(message,attachedError,service){
        super(message,attachedError,service);
        this.name="AwsService_TimeOut_Error";
    }
}

class AwsService_Unavailable_Error extends AwsService_Error{
    constructor(message,attachedError,service){
        super(message,attachedError,service);
        this.name="AwsService_Unavailable_Error";
    }
}

class AwsService_Unknown_Error extends AwsService_Error{
    constructor(message,attachedError,service){
        super(message,attachedError,service);
        this.name="AwsService_Unknown_Error";
    }
}

module.exports= {aws_errorHandler,
    AwsService_Error,
    AwsService_TimeOut_Error,
    AwsService_Unavailable_Error,
    AwsService_Unknown_Error
}