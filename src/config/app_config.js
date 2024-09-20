import { get_env } from "./get_env.js";


get_env();


//Variables de conexion
const APP_CONN_VARS={
    host:process.env.HOST,
    port:process.env.PORT,
}

export {APP_CONN_VARS};