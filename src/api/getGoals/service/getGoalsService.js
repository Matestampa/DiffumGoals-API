const {PAGE_LIMIT, SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {getGoals_errorHandler}=require("./error_handler.js");

const { getGoals_fromDB,applySignedUrls_4_goals } = require("./utils.js");

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

module.exports={getGoals_Service};