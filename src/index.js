import { App } from "./app.js";
import { APP_CONN_VARS } from "./config/app_config.js";

import { connect } from "./db/mongodb/index.js";

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