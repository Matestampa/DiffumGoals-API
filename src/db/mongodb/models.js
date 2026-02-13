const mongoose=require("mongoose");

const {goalSchema,userSchema}=require("@matestampa/diffum-goals_mongoose-schemas");

 // Creación del modelo a partir del esquema
const GoalModel = mongoose.model('Goal', goalSchema);
const UserModel = mongoose.model('User', userSchema);

module.exports= {GoalModel, UserModel};