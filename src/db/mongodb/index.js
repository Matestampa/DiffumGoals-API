const { connect_MongoDB, disconnect_MongoDB, MongoDB_Error} = require("./connection.js");

const {GoalModel}=require("./models.js");

module.exports= {connect_MongoDB,disconnect_MongoDB, MongoDB_Error,
        GoalModel}