const {PAGE_LIMIT, GOALS_STATUS_CONFIG}=require("../const_vars.js");

const {getGoals_errorHandler}=require("./error_handler.js");

const { getGoals_fromDB,getGoal_originalImage_fromDB,add_imgsUrls,getSignedUrl } = require("./utils.js");

async function getGoals_Service(page, goalStatus, order){
    let goals=[];
    
    // Get filter and orderField based on goalStatus
    const { filter, orderField } = GOALS_STATUS_CONFIG[goalStatus];
    
    try{
        goals = await getGoals_fromDB(page, filter, orderField, order);
    } 
    catch(e){
        let user_error=await getGoals_errorHandler(e);
        return {error:user_error,data:null};
    }
    
    // Add signed URLs to each goal
    goals=add_imgsUrls(goals);

    //Know if there are more pages
    let nextPage = goals.length === PAGE_LIMIT ? page + 1 : null;
    
    return { error: null, data: { goals, nextPage } };   
}

async function getGoal_originalImage_Service(goal_id){


    let s3_imgName_original
    try{
        s3_imgName_original=await getGoal_originalImage_fromDB(goal_id);
        if (!s3_imgName_original){
            let user_error=await getGoals_errorHandler("NOT_FOUND");
            return {error:user_error,data:null};

        }
    }
    catch(e){
        let user_error=await getGoals_errorHandler(e);
        return {error:user_error,data:null};
    }

    let original_image_signedUrl=getSignedUrl(s3_imgName_original.s3_imgName_original);

    return {error:null,data:{img_url: original_image_signedUrl}};



}

module.exports={getGoals_Service,getGoal_originalImage_Service};