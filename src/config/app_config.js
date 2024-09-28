const { get_env } = require("./get_env.js");


get_env();


//Variables de conexion
const APP_CONN_VARS={
    host:process.env.HOST,
    port:process.env.PORT,
}

module.exports= {APP_CONN_VARS};