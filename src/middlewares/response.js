//---------------------------- SUCCESS NORMAL RESPONSE ----------------------------
function normal_response(res,message,data){
    
    let response_message=message? message: "Ok";

    res.status(200).json({
        message:response_message,
        data:data
    });
}

module.exports={normal_response};