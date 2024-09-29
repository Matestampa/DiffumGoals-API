const { App } = require("./app.js");

const { APP_CONN_VARS } = require("./config/app_config.js");

const { connect } = require("./db/mongodb");

const PORT=APP_CONN_VARS.port;

async function start(){
    let {error}=await connect();

    if (!error){
        App.listen(PORT,()=>{
            console.log(`App running on port:${PORT}`);
        }) 
    }

}
start();

/*App.listen(PORT,()=>{
    console.log(`App running on port:${PORT}`);
})*/