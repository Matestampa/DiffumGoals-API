import { App } from "./app.js";
import { APP_CONN_VARS } from "./config/app_config.js";

const PORT=APP_CONN_VARS.port;

App.listen(PORT,()=>{
    console.log(`App running on port:${PORT}`);
})