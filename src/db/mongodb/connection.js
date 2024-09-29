const mongoose = require("mongoose");

const { MONGODB_VARS } = require("../../config/mongodb.js");

const { internalError_handler, InternalError } = require("../../error_handling");

//----- CONNECTION STRING/URL ----------
const connectionString=MONGODB_VARS.url;


async function connect(){
    try{
        await mongoose.connect(connectionString);
        return {error:false}
    }

    catch(e){
        //Already handled by "EROR HANDLING" BELOW
        return {error:true} //Just return error to let the caller know
    }
}

async function disconnect(){
    mongoose.connection.close();
}

//------------------- ERROR HANDLING --------------------------------
mongoose.connection.on("error",e=>{
    internalError_handler(new MongoDB_Connection_Error("",e));
})


class MongoDB_Connection_Error extends InternalError{
    constructor(message,attachedError){
        super(message,attachedError)
        this.name="MongoDB_Connection_Error";
        this.critic=true;
    }
}


module.exports= {connect,disconnect};