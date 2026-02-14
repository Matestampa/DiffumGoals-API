
const {CLOUDFRONT}=require("../../../aws_services")

const {PAGE_LIMIT,SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {GoalModel}=require("../../../db/mongodb");

async function getGoals_fromDB(page,limitDate_order){
    
    try {
        return await GoalModel.find()
            .select('descr limit_date s3_imgName_latest expired completed')
            .sort({limit_date: limitDate_order})
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

//Receives array of goals objects and returns the same array with the signed URL image
//applied to each goal. Adds "imgUrl" and removes "s3_imgName".
function applySignedUrls_4_goals(goals) {
    const modifiedGoals = [];
    for (let i = 0; i < goals.length; i++) {
        const goal = goals[i]//.toObject(); // Convert Mongoose document to plain JavaScript object
        goal["img_url"] = CLOUDFRONT.get_SignedUrl(goal.s3_imgName_latest, new Date(Date.now() + SGNDURL_LIMITDATE_MS));
        delete goal["s3_imgName_latest"];
        modifiedGoals.push(goal);
    }
    
    return modifiedGoals;
}

function getSignedUrl(s3_imgName){

    return CLOUDFRONT.get_SignedUrl(s3_imgName, new Date(Date.now() + SGNDURL_LIMITDATE_MS));

}

module.exports={getGoals_fromDB,getGoal_originalImage_fromDB,applySignedUrls_4_goals,getSignedUrl};