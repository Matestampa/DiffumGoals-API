const { get_env } = require("./get_env.js");

get_env();

const LOG_VARS={
    infoLogPath:process.env.INFO_LOGS_PATH,
    errorLogPath:process.env.ERROR_LOGS_PATH,
}


module.exports= {LOG_VARS};