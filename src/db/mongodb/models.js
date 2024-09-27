const mongoose=require("mongoose");

const {Schema}=require("mongoose");

const goalSchema = new Schema({
    user_id: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    descr: {
      type: String,
      required: true,
      description: "Description of the goal",
    },
    limit_date: {
      type: Date,
      required: true,
      description: "Limit to achieve the goal",
    },
    s3_imgName: {
      type: String,
      required: true,
      description: "Name of file in the S3 bucket",
    },
    untouched_pix: {
      type: [[Number]],
      required: true,
      description: "Array of untouched pixel positions",
    },
    cant_pix_xday:{
      type:Number,
      require:true,
      description:"Quantity of pixels to diffum per day"

    },
    diffum_color: {
      type: [Number],
      required: true,
    },
    last_diffumDate: {
      type: Date,
      required: true,
    }
  }, {
    timestamps: { createdAt: true, updatedAt: false }
  });
  

// Creación del modelo a partir del esquema
const GoalModel = mongoose.model('Goal', goalSchema);

module.exports= {GoalModel};