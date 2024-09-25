import { get_env } from "./get_env.js";

get_env();


const AWS_S3_VARS={
    bucketRegion:process.env.S3_BUCKET_REGION,
    bucketName:process.env.S3_BUCKET_NAME
}

export {AWS_S3_VARS}