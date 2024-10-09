
const {DFLT_IMG_SIZE,SGNDURL_LIMITDATE_MS}=require("../const_vars.js");

const {get_diffumColor,
       get_cant_pix_xday,
       get_untouchedPixArr,
       generateRand_MONGO_S3_ids}=require("./utils.js");

const {S3_FUNCS,CLOUDFRONT}=require("../../../aws_services");
const {GoalModel}=require("../../../db/mongodb");

const {newGoal_errorHandler}=require("./error_handler.js");


async function newGoal_Service(user_id,descr,limit_date,imgBuffer){
    
    //get diffum color
    let diffum_color=get_diffumColor(imgBuffer);

    let cant_pix_xday=get_cant_pix_xday(DFLT_IMG_SIZE.width*DFLT_IMG_SIZE.height, limit_date);
    
    //get pixel pos array
    let untouched_pix=get_untouchedPixArr(DFLT_IMG_SIZE.width,DFLT_IMG_SIZE.height);
    
    //generate id for DB & S3
    let {db_id,s3_id}=generateRand_MONGO_S3_ids();

    //Save To S3
    try{
        await S3_FUNCS.saveObject(s3_id,imgBuffer,"image/png");
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
            descr:descr,
            limit_date:limit_date,
            s3_imgName:s3_id,
            untouched_pix:untouched_pix,
            cant_pix_xday:cant_pix_xday, ////--------------
            diffum_color:diffum_color,
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
    let img_url=CLOUDFRONT.get_SignedUrl(s3_id
                                        ,new Date(Date.now()+SGNDURL_LIMITDATE_MS)
    );

    return {error:null,data:{goal_id:db_id,img_url:img_url}}
}

module.exports={newGoal_Service};