
const {CLOUDFRONT}=require("../../../aws_services")

const {PAGE_LIMIT,SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {GoalModel}=require("../../../db/mongodb");

// Fetches goals from DB with filter and dynamic sort field
async function getGoals_fromDB(page, filter, orderField, order){
    
    try {
        return await GoalModel.find(filter)
            .select('descr expired limit_date s3_imgName_latest completed completed_date s3_imgName_completed')
            .sort({ [orderField]: order })
            .skip((page-1)*PAGE_LIMIT)
            .limit(PAGE_LIMIT).lean();
    }
    catch (error) {
        throw error;
    }
}

async function getGoal_originalImage_fromDB(goal_id){
    try {
        return await GoalModel.findById(goal_id)
            .select('s3_imgName_original')
            .lean();
    }
    catch (error) {
        throw error;
    }
}


//Receives array of goals objects and returns the same array with signed URLs.
//Always adds "img_latest" from s3_imgName_latest.
//If completed === true, also adds "img_completed" from s3_imgName_completed.
function add_imgsUrls(goals) {
    const modifiedGoals = [];
    for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        
        // Always sign the url from s3_imgName_latest and add as img_latest
        goal["img_latest"] = getSignedUrl(goal.s3_imgName_latest);
        delete goal["s3_imgName_latest"];
        
        // If completed, also sign s3_imgName_completed and add as img_completed
        if (goal.completed === true) {
            goal["img_completed"] = getSignedUrl(goal.s3_imgName_completed);
        }
        delete goal["s3_imgName_completed"];
        
        modifiedGoals.push(goal);
    }
    
    return modifiedGoals;
}

function getSignedUrl(s3_imgName){

    return CLOUDFRONT.get_SignedUrl(s3_imgName, new Date(Date.now() + SGNDURL_LIMITDATE_MS));

}

module.exports={getGoals_fromDB,getGoal_originalImage_fromDB,add_imgsUrls,getSignedUrl};