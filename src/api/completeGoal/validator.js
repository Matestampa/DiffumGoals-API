//validar la imagen y el campo goal_id (el user_id ya lo chequeo el middleware de auth)

const Joi=require("joi")
const sharp=require("sharp")


const {DEFLT_API_ERRORS}=require("../../error_handling");

//Image size
const {DFLT_IMG_SIZE}=require("./const_vars.js");

const completeGoal_ValSchema=Joi.object({
    goal_id: Joi.string().hex().length(24).required(), // ID del objetivo a completar
});

//Util validation of image
async function validate_newGoalImg(reqImgFile){

   //Validate existence & format
   if (!reqImgFile || reqImgFile.mimetype!="image/png"){return {error:true,message:"Image must be png"}}
   
   //Validate size
   let image=sharp(reqImgFile.buffer);
   let metadata=await image.metadata();
   
   if (metadata.width!=DFLT_IMG_SIZE.width || metadata.height!=DFLT_IMG_SIZE.height){
      return {error:true,message:`Image must be ${DFLT_IMG_SIZE.width}x${DFLT_IMG_SIZE.height}`};
   }
   return {error:false};
}



async function validate_completeGoal(reqBody,reqImgFile){
    let error,message;

    //Validate body
    ({error}=completeGoal_ValSchema.validate(reqBody))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ(error.message)}}

    //Validate image
    ({error,message}=await validate_newGoalImg(reqImgFile))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ(message)}}

    return {error:undefined};
}


module.exports={
    validate_completeGoal
}