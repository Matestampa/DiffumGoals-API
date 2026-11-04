const dotenv = require("dotenv");
const { join } = require("path");
const { validate_env } = require("./validate_env.js");

const APP_ENV=process.env.APP_ENV?process.env.APP_ENV:"local";

// "local" and "test" load vars synchronously from a .env file here (.env.local / .env.test),
// since it's safe/instant and every config module (and tests) can rely on it at require-time.
// "dev"/"prod" get their vars from AWS SSM Parameter Store instead, loaded
// asynchronously by ./load_env.js BEFORE any config module is required (see src/index.js).
if (APP_ENV === "local" || APP_ENV === "test"){
    dotenv.config({ path: join(__dirname, `../../.env.${APP_ENV}`) });
    validate_env(APP_ENV);
}

function get_env(){
    return APP_ENV;
}

module.exports= {get_env};