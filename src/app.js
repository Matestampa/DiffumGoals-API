const express = require("express");
const App = express();

const cors=require("cors");

const cookieParser = require("cookie-parser");

//---------------------- IMPORT MIDLEWARES ---------------------


//----------------------- IMPORT ROUTES ------------------------

const usersRoutes = require("./routes/usersRoutes.js");

const goalsRoutes = require("./routes/goalsRoutes.js");



//-------------------- GENERAL EXPRESS CONFIG ---------------------

App.use(cors(
    {
        credentials:true,
        origin:(origin,callback)=>{
            callback(null,true);
        }
    }
));

App.use(express.json());
App.use(cookieParser());



//-------------------- ENDPOINTS ----------------------------

App.use("/serverUp",async (req,res)=>{
    res.send("Server Up")
})


App.use("/users",usersRoutes)

App.use("/goals",goalsRoutes)


module.exports= {App};