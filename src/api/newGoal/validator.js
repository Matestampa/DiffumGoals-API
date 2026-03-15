const Joi=require("joi")
const sharp=require("sharp")

const {DEFLT_API_ERRORS}=require("../../error_handling");

//###### CONST VARS FOR VALIDATION ########

//limit_date bounds
const MIN_LIMITDATE_DAYS=15;
const MAX_LIMITDATE_DAYS=90;

//Image size
const {DFLT_IMG_SIZE}=require("./const_vars.js");

//#########################################


//Util validation of general req.body
const addDays = (days) => {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const newGoal_ValSchema=Joi.object({
    descr: Joi.string().min(5).max(255).required(), // Descripción
    limit_date: Joi.date().
                min(addDays(MIN_LIMITDATE_DAYS)).
                max(addDays(MAX_LIMITDATE_DAYS))
                .required().messages({
                    "date.min": `"limit_date" must be at least ${MIN_LIMITDATE_DAYS} days in the future and a maximum of ${MAX_LIMITDATE_DAYS} days in the future`,
                    "date.max": `"limit_date" must be at least ${MIN_LIMITDATE_DAYS} days in the future and a maximum of ${MAX_LIMITDATE_DAYS} days in the future`
                }),
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


//##### VALIDATION OF GENERAL REQ.BODY FIELDS & IMAGE ########
async function validate_newGoal(reqBody,reqImgFile){
    let error,message;

    ({error}=newGoal_ValSchema.validate(reqBody))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ(error.message)}}

    ({error,message}=await validate_newGoalImg(reqImgFile))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ(message)}}

    return {error:undefined};

}


module.exports= {validate_newGoal};