
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { AWS_S3_VARS } = require("../config/aws_config.js");
const { aws_errorHandler } = require("./error_handler.js");

//----------------------- S3 class client & vars---------------------------

const S3=new S3Client({
    region:AWS_S3_VARS.bucketRegion,
    credentials : {
        accessKeyId : AWS_S3_VARS.accessKeyId,
        secretAccessKey : AWS_S3_VARS.secretAccessKey

    }
})

const BUCKET_NAME=AWS_S3_VARS.bucketName;

//-----------------------------------------------------------------------


//-------------------- Functions ----------------------------------

async function saveObject(key,dataBuffer,contentType){
      
    let params={
        Bucket:BUCKET_NAME, 
        Key:key, 
        Body:dataBuffer,
        ContentType:contentType
    }

    let command=new PutObjectCommand(params);
    try{
        await S3.send(command); 
    }
    catch(e){
        aws_errorHandler(e,"S3");
    };

    //return {ok:true,error:undefined} 
}

const S3_FUNCS={
    saveObject
}

module.exports = S3_FUNCS;
