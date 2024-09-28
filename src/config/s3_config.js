const { get_env } = require("./get_env.js");

get_env();


const AWS_S3_VARS={
    bucketRegion:process.env.S3_BUCKET_REGION,
    bucketName:process.env.S3_BUCKET_NAME
}

module.exports= {AWS_S3_VARS}