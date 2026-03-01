
const {generate_S3Image_name}=require("./utils");

const {S3_FUNCS,CLOUDFRONT}=require("../../../aws_services");
const {GoalModel}=require("../../../db/mongodb");

const {completeGoal_errorHandler}=require("./error_handler.js");

const {DEFLT_API_ERRORS} = require("../../../error_handling");


function validate_completeGoalOperation(goalData,userId){
    if (!goalData) {
            return { error: DEFLT_API_ERRORS.BAD_REQ("Goal not found")};
        }
        //Chequear que sea del user_id correspomndiente
        if (goalData.user_id.toString() !== userId) {
            return { error: DEFLT_API_ERRORS.NOT_AUTH("You do not have permission to complete this goal")};
        }

        if (goalData.expired) {
            return { error: DEFLT_API_ERRORS.BAD_REQ("Goal has expired and cannot be completed")};
        }

        if (goalData.completed) {
            return { error: DEFLT_API_ERRORS.BAD_REQ("Goal is already completed")};
        }

        return {error:null};
}


async function completeGoal_Service(userId,goalId,imgBuffer){

    let error;
    
    try {
         //Traer la goal
        let goalData = await GoalModel.findById(goalId).select('user_id expired completed');

        //Validar la operacion
        ({error} = validate_completeGoalOperation(goalData,userId));
        
        if(error) {return { error, data: null };} 

        //Make image name
        let s3ImageName = generate_S3Image_name(goalId);

        //Save To S3
        await S3_FUNCS.saveObject(s3ImageName, imgBuffer, "image/png");

        //Update db
        goalData["completed"] = true;
        goalData["s3_imgName_completed"] = s3ImageName;
        goalData["completed_at"] = new Date();
        await goalData.save();

        return { error: null, data: { goal_id: goalId } };

    }
    catch(e){
        let user_error=await completeGoal_errorHandler(e);
        return {error:user_error,data:null};
    }
}

module.exports={
    completeGoal_Service
}
