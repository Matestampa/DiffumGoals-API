const Joi=require("joi")
const sharp=require("sharp")

const {DEFLT_API_ERRORS}=require("../error_handling/index.js");

//###### CONST VARS FOR VALIDATION ########
//limit_date bounds
const MIN_LIMITDATE_DAYS=15;
const MAX_LIMITDATE_DAYS=90;

//Image size
const IMG_WIDTH=100;
const IMG_HEIGHT=100;

//#########################################


//Util validation of general req.body
const addDays = (days) => {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const newGoal_ValSchema=Joi.object({
    user_id: Joi.string().alphanum().length(24).required(), // ObjectId if MongoDB
    descr: Joi.string().min(5).max(255).required(), // Descripción
    limit_date: Joi.date().
                min(addDays(MIN_LIMITDATE_DAYS)).
                max(addDays(MAX_LIMITDATE_DAYS))
                .required(), // limit date, ISO format.
});


//Util validation of image
async function validate_newGoalImg(reqImgFile){

   //Validate existence & format
   if (!reqImgFile || reqImgFile.mimetype!="image/png"){return {error:true}}
   
   //Validate size
   let image=sharp(reqImgFile.buffer);
   let metadata=await image.metadata();
   
   if (metadata.width!=IMG_WIDTH || metadata.height!=IMG_HEIGHT){
      return {error:true};
   }
   return {error:false};
}


//##### VALIDATION OF GENERAL REQ.BODY FIELDS & IMAGE ########
async function validate_newGoal(reqBody,reqImgFile){
    let error;

    ({error}=newGoal_ValSchema.validate(reqBody))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ("Wrong body req data")}}

    ({error}=await validate_newGoalImg(reqImgFile))

    if (error){return {error:DEFLT_API_ERRORS.BAD_REQ("Wrong img data")}}

    return {error:undefined};

}


module.exports= {validate_newGoal};