import mongoose from "mongoose";

import {MONGODB_VARS} from "../../config/mongodb.js";

import {internalError_handler,InternalError} from "../../error_handling/index.js";

//----- CONNECTION STRING/URL ----------
const connectionString=MONGODB_VARS.url;


async function connect(){
    try{
        await mongoose.connect(connectionString);
        return {error:false}
    }

    catch(e){
        //internalError_handler(new MongoDB_Connection_Error("",e));
        return {error:true}
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


export {connect,disconnect};