const {apiError_handler}=require("../error_handling");
const {normal_response}=require("../middlewares/response.js");

const {validate_newGoal}=require("../api/newGoal/validator.js");   

const {newGoal_Service}=require("../api/newGoal/service/newGoalService.js"); 


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
        img_id:data.img_id
    })
}


async function getGoals(){}

const GoalsController={newGoal,getGoals}

module.exports=GoalsController;