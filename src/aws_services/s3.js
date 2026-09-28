
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { AWS_S3_VARS } = require("../config/aws_config.js");
const { aws_errorHandler } = require("./error_handler.js");

//----------------------- S3 class client & vars---------------------------

// Access keys are only set locally (.env.dev). On EC2 (prod/testProd) they're
// omitted so the SDK falls back to the instance role via its default credential chain.
const S3=new S3Client({
    region:AWS_S3_VARS.bucketRegion,
    ...(AWS_S3_VARS.accessKeyId && AWS_S3_VARS.secretAccessKey
        ? { credentials: { accessKeyId: AWS_S3_VARS.accessKeyId, secretAccessKey: AWS_S3_VARS.secretAccessKey } }
        : {})
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
