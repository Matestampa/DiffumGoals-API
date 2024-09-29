const express = require("express");
const App = express();

const cookieParser = require("cookie-parser");
//---------------------- IMPORT MIDLEWARES ---------------------


//----------------------- IMPORT ROUTES ------------------------
const goalsRoutes = require("./routes/goalsRoutes.js");


//-------------------- GENERAL EXPRESS CONFIG ---------------------


App.use(express.json());
App.use(cookieParser());



//-------------------- ENDPOINTS ----------------------------

App.use("/serverUp",async (req,res)=>{
    res.send("Server Up")
})

App.use("/goals",goalsRoutes)


module.exports= {App};