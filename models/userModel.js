  
  const mongoose = require('mongoose')

const userSchema=mongoose.Schema({

   name:{
  type:String,
  required: true
    },
    email:{
        type: String,
        unique:true,
        required: true
    },  
    mobile:{
        type: Number,
    },  
   
    password:{
        type: String,
       
    },   

   is_admin:{
    type:Number,
    default:0
   },
   is_Active:{
    type:Boolean,
    default:true
   },
  is_Verified:{
    type:Boolean,
    default:false
     },
  otps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OTP' }],

},
{
  timestamps:true
}
)   
module.exports = mongoose.model('User',userSchema); 