const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const {AUTH_VARS} = require("../../../config/app_config");

const {UserModel} = require("../../../db/mongodb");



const JWT_EXPIRATION_SECONDS = parseInt(AUTH_VARS.JWT_EXPIRATION_MS) / 1000;

//Get use by username or id
async function get_user(identifier){
    
    let userData;

    // If identifier looks like an ObjectId, try finding by ID first
    if (mongoose.Types.ObjectId.isValid(identifier) && identifier.length === 24) {
        userData = await UserModel.findById(identifier);
        
    }
    
    // Otherwise, search by username
    userData = await UserModel.findOne({ username: identifier });
    return userData;
}

async function create_user(username, password){
    const user = new UserModel({
        username,
        password   
    });
    
    let userData = await user.save();
    return userData;
}


function compare_passwords(inputPassword, storedPassword) {
    return inputPassword === storedPassword;
}

function generate_JWT(user_id, username) {
    const payload = {
        user_id,
        username
    };

    const token = jwt.sign(payload, AUTH_VARS.JWT_SECRET, { expiresIn: JWT_EXPIRATION_SECONDS });
    return token;
}



module.exports = {
    get_user,
    create_user,
    compare_passwords,
    generate_JWT
}