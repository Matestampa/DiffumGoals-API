const {apiError_handler}=require("../error_handling");
const {normal_response}=require("../middlewares/response.js");

const {validate_newGoal}=require("../api/newGoal/validator.js");
const {validate_getGoals}=require("../api/getGoals/validator.js");   

const {newGoal_Service}=require("../api/newGoal/service/newGoalService.js"); 
const {getGoals_Service} =require("../api/getGoals/service/getGoalsService.js");


async function newGoal(req,res){
    
    let error;
    
    //Validate data
    ({error}=await validate_newGoal(req.body,req.file))

    if (error){apiError_handler(error,res);return};
    
    //Call cservice
    let {user_id,descr,limit_date}=req.body;

    let data;
    ({error,data}=await newGoal_Service(user_id,descr,limit_date,req.file.buffer))
    
    if (error){apiError_handler(error,res);return};

    normal_response(res,"",{
        goal_id:data.goal_id,
        img_url:data.img_url
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

const GoalsController={newGoal,getGoals}

module.exports=GoalsController;