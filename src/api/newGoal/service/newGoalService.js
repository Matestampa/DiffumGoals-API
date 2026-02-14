const {GOALS_LOGIC_VARS}=require("../../../config/app_config.js");

const {DFLT_IMG_SIZE,SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {countCurrentGoals,
       countCurrentGoalsByUser,
       get_diffumColor,
       add_4thChannelToBuffer,
       get_cant_pix_xday,
       generateRand_MONGO_S3_ids,generate_S3Images_names}=require("./utils.js");

const {S3_FUNCS,CLOUDFRONT}=require("../../../aws_services");
const {GoalModel}=require("../../../db/mongodb");

const {newGoal_errorHandler}=require("./error_handler.js");

const {DEFLT_API_ERRORS} = require("../../../error_handling");


async function newGoal_Service(user_id,username,descr,limit_date,imgBuffer){

    //Check Goals Limit
    try{

        //By user
        let userGoalsCount=await countCurrentGoalsByUser(user_id);
        if (userGoalsCount>=GOALS_LOGIC_VARS.user_limit){
            return {error:DEFLT_API_ERRORS.BAD_REQ("User's Goals Limit Reached"),data:null};
        }

        //Global
        let currentGoalsCount=await countCurrentGoals();
        if (currentGoalsCount>=GOALS_LOGIC_VARS.global_limit){
            return {error:DEFLT_API_ERRORS.BAD_REQ("Goals Limit Reached"),data:null};
        }
    }
    catch(e){
        let user_error=await newGoal_errorHandler(e);
        return {error:user_error,data:null};
    }


    //get diffum color
    //let diffum_color=await get_diffumColor(imgBuffer);

    //Add 4th channel to image buffer, to make transparency possible for diffum
    imgBuffer=await add_4thChannelToBuffer(imgBuffer);

    let cant_pix_xday=get_cant_pix_xday(DFLT_IMG_SIZE.width*DFLT_IMG_SIZE.height, limit_date);
    
    //generate id for DB & S3
    let {db_id,s3_id}=generateRand_MONGO_S3_ids();

    //generate S3 image names
    let {original_image_name,latest_image_name}=generate_S3Images_names(s3_id);

    //Save To S3
    try{
        await S3_FUNCS.saveObject(original_image_name,imgBuffer,"image/png");
        await S3_FUNCS.saveObject(latest_image_name,imgBuffer,"image/png");
    }
    catch(e){
        let user_error=await newGoal_errorHandler(e);
        return {error:user_error,data:null};
    } //return de error para el user
    
    //Save to DB
    try{
        let newGoal=new GoalModel({
            _id:db_id, // cambiar los models para q acepte _id
            user_id:user_id,
            username:username,
            descr:descr,
            limit_date:limit_date,
            s3_imgName_original:original_image_name,
            s3_imgName_latest:latest_image_name,
            cant_pix_xday:cant_pix_xday,
            last_diffumDate:new Date()
        })
        await newGoal.save();
    }
    catch(e){
        let user_error=await newGoal_errorHandler(e);
        
        //Should send alert to cancel S3 upload.
        
        return {error:user_error,data:null};
    }
    
    //Get Signed URL for created image
    let img_url=CLOUDFRONT.get_SignedUrl(latest_image_name
                                        ,new Date(Date.now()+SGNDURL_LIMITDATE_MS)
    );

    return {error:null,data:{goal_id:db_id,img_url:img_url}}
}

module.exports={newGoal_Service};