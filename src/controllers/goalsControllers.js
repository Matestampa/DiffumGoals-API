const {apiError_handler}=require("../error_handling");
const {normal_response}=require("../middlewares/response.js");

const {validate_newGoal}=require("../api/newGoal/validator.js");
const {validate_completeGoal}=require("../api/completeGoal/validator.js");
const {validate_getGoals, validate_getGoal_originalImage}=require("../api/getGoals/validator.js");   

const {newGoal_Service}=require("../api/newGoal/service/newGoalService.js"); 
const {completeGoal_Service}=require("../api/completeGoal/service/completeGoalService.js");
const {getGoals_Service,getGoal_originalImage_Service} =require("../api/getGoals/service/getGoalsService.js");


async function newGoal(req,res){
    
    let error;
    
    //Validate data
    ({error}=await validate_newGoal(req.body,req.file))

    if (error){apiError_handler(error,res);return};
    
    //Call cservice
    let user_id=req.user_id;
    let username=req.username;
    let {descr,limit_date}=req.body;

    let data;
    ({error,data}=await newGoal_Service(user_id,username,descr,limit_date,req.file.buffer))
    
    if (error){apiError_handler(error,res);return};

    normal_response(res,"",{
        goal_id:data.goal_id,
        img_url:data.img_url
    })
}

async function completeGoal(req,res){
    let error;

    ({error}=await validate_completeGoal(req.body,req.file))

    if (error){apiError_handler(error,res);return};

    let {goal_id}=req.body;

    let data;
    ({error,data}=await completeGoal_Service(req.user_id,goal_id,req.file.buffer))

    if (error){apiError_handler(error,res);return};

    normal_response(res,"",{
        goal_id:data.goal_id,
    })
}

async function getGoals(req,res){
    
    let error,queryData;
    
    // Validate data
    ({error, queryData} = validate_getGoals(req.query));

    if (error) {apiError_handler(error, res);return;}
    
    let {page,limitDate_order}=queryData;

    // Call service
    let data;
    ({error, data} = await getGoals_Service(page,limitDate_order));

    if (error) {apiError_handler(error, res);return;}

    normal_response(res, "", {
        goals: data.goals,
        nextPage: data.nextPage
    });

}
//:id/originalImage
async function getGoal_originalImage(req,res){
    let error, paramData;
    
    //Validate id param
    ({error, paramData} = validate_getGoal_originalImage(req.params));
    
    if (error) {
        apiError_handler(error, res);
        return;
    }
    
    let {id: goal_id} = paramData;

    let data;
    ({error,data}=await getGoal_originalImage_Service(goal_id));

    if (error){apiError_handler(error,res);return};

    normal_response(res,"",{
        img_url:data.img_url
    })
}

const GoalsController={newGoal,completeGoal,getGoals,getGoal_originalImage}

module.exports=GoalsController;