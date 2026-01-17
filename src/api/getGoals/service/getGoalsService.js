const {PAGE_LIMIT, SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {getGoals_errorHandler}=require("./error_handler.js");

const { getGoals_fromDB,getGoal_originalImage_fromDB,applySignedUrls_4_goals,getSignedUrl } = require("./utils.js");

async function getGoals_Service(page,limitDate_order){
    let goals=[];
    
    try{
        goals = await getGoals_fromDB(page,limitDate_order);
    } 
    catch(e){
        let user_error=await getGoals_errorHandler(e);
        return {error:user_error,data:null};
    }
    
    // Add signedUrl to each goal
    goals=applySignedUrls_4_goals(goals);

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