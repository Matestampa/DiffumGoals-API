//--------------------- BASE CLASS FOR API ERRORS ----------------------
class Error4User extends Error{
    constructor(message,data){
      super(message);
      this.message=message; 
      this.data=data;
      this.code;
      this.default_message;
      this.status_code;
    }
}


//-------------------------- CHILD CLASSES -------------------------

class Api_NotAuth_Error extends Error4User{
    constructor(message,data){
        super(message,data);
        
        this.code="NOT_AUTH";
        this.default_message="Unhautorized user"
        this.status_code=401;
    }
}

class Api_BadRequest_Error extends Error4User{
    constructor(message,data){
        super(message,data);
        
        this.code="BAD_REQ";
        this.default_message="Bad request"
        this.status_code=404;
    }
}

class Api_Retry_Error extends Error4User{
    constructor(message,data){
        super(message,data)
        
        this.code="RETRY";
        this.status_code=404;
        this.default_message="Retry the request";
    }
}

class Api_ServerError extends Error4User{
    constructor(message,data){
        super(message,data);
        
        this.code="SERVER";
        this.default_message="Server malfunc"
        this.status_code=500;
    }
}


//----------------- OBJ WITH THIS GENERAL/DEFAULT API ERRORS -------------------.
const DEFLT_API_ERRORS={
    NOT_AUTH:(message,data)=>new Api_NotAuth_Error(message,data),
    BAD_REQ:(message,data)=> new Api_BadRequest_Error(message,data),
    RETRY:(message,data)=> new Api_Retry_Error(message,data),
    SERVER: (message,data)=> new Api_ServerError(message,data),
}


module.exports= {Error4User,DEFLT_API_ERRORS};