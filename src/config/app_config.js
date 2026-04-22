const { get_env } = require("./get_env.js");


get_env();


//Variables de conexion
const APP_CONN_VARS={
    host:process.env.HOST,
    port:process.env.PORT,
}

const AUTH_VARS={
    JWT_COOKIE_NAME:"token",
    JWT_COOKIE_SECURE: process.env.JWT_COOKIE_SECURE,
    JWT_SECRET:process.env.JWT_SECRET,
    JWT_EXPIRATION_MS:process.env.JWT_EXPIRATION_MS
}

//Goals Logic vars

const GOALS_LOGIC_VARS={
    user_limit:process.env.GOALS_USER_LIMIT,
    global_limit:process.env.GOALS_GLOBAL_LIMIT
}

const GOOGLE_OAUTH_VARS={
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    FRONTEND_URL: process.env.FRONTEND_URL
}

module.exports= {APP_CONN_VARS, AUTH_VARS, GOALS_LOGIC_VARS, GOOGLE_OAUTH_VARS};