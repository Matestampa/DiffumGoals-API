
//---------------- API ERROR HANDLER, FOR SENDING FORMATTED RESPONSES ------------------

async function apiError_handler(error,response){
    
    let response_message=error.message? error.message: error.default_message;

    response.status(error.status_code).json({
        status:error.status_code,
        error:{
            message:response_message,
            code:error.code,
            sub_code:error.sub_code ? error.sub_code : undefined,
            data:error.data 
        }
    });
}

export {apiError_handler};