  
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
        required: true
    },  
   
    password:{
        type: String,
        required:true
       
    },   

   is_admin:{
    type:Number,
    default:0
   },
   is_Active:{
    type:Boolean,
    default:true
   },
  // is_verified:{
  //   type:Number,
  //   default:0
  //    }
  otps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OTP' }],

  // token:{
  //   type:String,
  //   default:''
  // },

},
{
  timestamps:true
}
)   
module.exports = mongoose.model('User',userSchema); 