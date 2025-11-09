const { get_env } = require("./get_env.js");


get_env();


//Variables de conexion
const APP_CONN_VARS={
    host:process.env.HOST,
    port:process.env.PORT,
}


//Goals Logic vars

const GOALS_LOGIC_VARS={
    limit:process.env.GOALS_LIMIT
}

module.exports= {APP_CONN_VARS, GOALS_LOGIC_VARS};