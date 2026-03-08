const {PAGE_LIMIT, GOALS_STATUS_CONFIG}=require("../const_vars.js");

const {getGoals_errorHandler}=require("./error_handler.js");

const { getGoals_fromDB,add_imgsUrls } = require("./utils.js");

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

async function getMyGoals_Service(user_id, page){
    let goals=[];
    
    // Filter only by user_id, return all statuses
    const userFilter = { user_id: user_id };
    
    try{
        goals = await getGoals_fromDB(page, userFilter, 'limit_date', 1);
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

module.exports={getGoals_Service,getMyGoals_Service};