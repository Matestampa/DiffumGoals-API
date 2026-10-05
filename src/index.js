const { load_env } = require("./config/load_env.js");

async function start(){
    // Must run before requiring anything that reads process.env at load time
    // (dotenv for local, AWS SSM Parameter Store for dev/prod).
    await load_env();

    const { App } = require("./app.js");
    const { APP_CONN_VARS } = require("./config/app_config.js");
    const {connect_MongoDB} = require("./db/mongodb");
    const { internalError_handler } = require("./error_handling/index.js");
    const {infoLogger} = require("./logs/loggers.js");

    const PORT=APP_CONN_VARS.port;

    let error=false;
    try{
        await connect_MongoDB();
        infoLogger.info("Connected to MongoDB");
    }
    catch(e){
        error=true;
        internalError_handler(e);
    }

    if (!error){
        App.listen(PORT,()=>{
            infoLogger.info(`App running on port:${PORT}`);
        }) 
    }

}
start();
