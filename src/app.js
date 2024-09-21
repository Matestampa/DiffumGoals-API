import express from "express";
const App=express();


import cookieParser from "cookie-parser";
//---------------------- IMPORT MIDLEWARES ---------------------



//----------------------- IMPORT ROUTES ------------------------

import goalsRoutes  from "./routes/goalsRoutes.js";

//-------------------- GENERAL EXPRESS CONFIG ---------------------


App.use(express.json());
App.use(cookieParser());



//-------------------- ENDPOINTS ----------------------------

App.use("/serverUp",async (req,res)=>{
    res.send("Server Up")
})

App.use("/goals",goalsRoutes)


export {App};