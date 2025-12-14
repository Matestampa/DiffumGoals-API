//const {disable_requests}=require("../../config/app_config.js");

//const {sendMail}=require("../../extra_services/mail.js");

const {infoLogger,errorLogger} = require("../../logs/loggers.js");

async function internalError_handler(error){
    //Si es critico, tira abajo el server o las requests.
    if (error.critic){
      //disable_requests();
      
      //console.log("REQUESTS DISABLED")

    }

    //Logearlo
    infoLogger.info(error)
    errorLogger.error(error.message ? error.message : ".", { errorName:error.name,errorMessage:error.message, stack: error.stack,attachedError:error.attachedError });

    
    //Enviar mail
    //send_ErrorMail(error.name,error.message,error.critic);

}

/*async function send_ErrorMail(name,message,critic){
    let mailSubject;
    let mailMessage;
    
    if (critic){
      mailSubject="REQUESTS DISABLED",
      mailMessage=`${name} | ${message} | critic: ${critic} | `
    }
    else{
      mailSubject=name;
      mailMessage=`${message} | critic: ${critic} | `
    }

    sendMail(mailSubject,mailMessage);
}*/



module.exports= {internalError_handler};