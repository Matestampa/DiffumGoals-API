const { get_env } = require("./get_env.js");

get_env();


const MONGODB_VARS={
    url:process.env.MONGODB_URL
}

module.exports= {MONGODB_VARS};