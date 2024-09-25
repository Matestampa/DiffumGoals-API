
import {S3Client,PutObjectCommand} from "@aws-sdk/client-s3";

import {AWS_S3_VARS} from "../config/s3_config.js";

import {aws_errorHandler} from "./error_handler.js";

//----------------------- S3 class client & vars---------------------------

const S3=new S3Client({
    region:AWS_S3_VARS.bucketRegion
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

export default S3_FUNCS;
