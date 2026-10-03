const dotenv = require("dotenv");
const { join } = require("path");

const APP_ENV=process.env.APP_ENV?process.env.APP_ENV:"local";

// Only "local" loads vars synchronously from a .env file here, since it's
// safe/instant and every config module (and tests) can rely on it at require-time.
// "dev"/"prod" get their vars from AWS SSM Parameter Store instead, loaded
// asynchronously by ./load_env.js BEFORE any config module is required (see src/index.js).
if (APP_ENV === "local"){
    dotenv.config({ path: join(__dirname, "../../.env.local") });
}

function get_env(){
    return APP_ENV;
}

module.exports= {get_env};