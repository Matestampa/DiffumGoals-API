// Single source of truth for every env var key the app reads from process.env.
// When a feature starts reading a new process.env.X, add its key here too,
// otherwise a missing value for it won't be caught by validate_env().

// Required in every environment (local/dev/prod)
const REQUIRED_COMMON = [
    "HOST",
    "PORT",
    "JWT_COOKIE_SECURE",
    "JWT_SECRET",
    "JWT_EXPIRATION_MS",
    "GOALS_USER_LIMIT",
    "GOALS_GLOBAL_LIMIT",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "FRONTEND_URL",
    "S3_BUCKET_REGION",
    "S3_BUCKET_NAME",
    "CLOUDFRONT_URL",
    "CLOUDFRONT_KEY_PAIR_ID",
    "CLOUDFRONT_PRIVATE_KEY",
    "CLOUDWATCH_AWS_REGION",
    "MONGODB_URL"
];

// Only required for APP_ENV=local (.env.local); on EC2 the instance role replaces these
const REQUIRED_LOCAL_ONLY = [
    "INFO_LOGS_PATH",
    "ERROR_LOGS_PATH",
    "S3_AWS_ACCESS_KEY_ID",
    "S3_AWS_SECRET_ACCESS_KEY",
    "CLOUDWATCH_AWS_ACCESS_KEY_ID",
    "CLOUDWATCH_AWS_SECRET_ACCESS_KEY"
];

// Only required for APP_ENV=dev/prod (EC2 + SSM Parameter Store)
const REQUIRED_REMOTE_ONLY = [
    "INFO_LOG_GROUP_NAME",
    "ERROR_LOG_GROUP_NAME"
];

function get_required_env_vars(APP_ENV){
    return APP_ENV === "local"
        ? [...REQUIRED_COMMON, ...REQUIRED_LOCAL_ONLY]
        : [...REQUIRED_COMMON, ...REQUIRED_REMOTE_ONLY];
}

module.exports = { get_required_env_vars };
