const { get_env } = require("./get_env.js");


get_env();


//Variables de conexion
const APP_CONN_VARS={
    host:process.env.HOST,
    port:process.env.PORT,
}

const AUTH_VARS={
    JWT_COOKIE_NAME:"token",
    JWT_SECRET:process.env.JWT_SECRET,
    JWT_EXPIRATION_MS:process.env.JWT_EXPIRATION_MS
}

//Goals Logic vars

const GOALS_LOGIC_VARS={
    limit:process.env.GOALS_LIMIT
}

module.exports= {APP_CONN_VARS, AUTH_VARS, GOALS_LOGIC_VARS};