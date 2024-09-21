//---------------------------- ERRORS -------------------------------------------

//--------------------- BASE CLASS FOR INTERNAL ERRORS --------------------------
class InternalError extends Error{
    constructor(message,attachedError){
      super(message);
      this.name="InternalError"
      this.message=message; //str
      this.attachedError=attachedError; //Error
      this.critic; //bool
    }
}


//------------------------- CHILD CLASSES  --------------------------------------
class UnknownError extends InternalError{
  constructor(message,attachedError){
    super(message,attachedError);
    this.name="UnknownError"
    this.critic=true;
  }
}



const GEN_INT_ERRORS={
  UNKNOWN:(message,attachedError)=>new UnknownError(message,attachedError)
}

export {InternalError,GEN_INT_ERRORS};