const mongoose=require("mongoose")
// mongoose.connect("mongodb://localhost:27017/E-Commerce")

const categorySchema = new mongoose.Schema({
    
catName:{
   type:String,
   required:true 
},
description:{
    type:String,
    required:true
},
offer:{
    type:Number,default:0
},
 expirationDate: {
      type: Date
        },

 OfferisActive:{
     type:Boolean,
     default:true
        },
is_Active:{
    type:Boolean,
    default:true
}

})

module.exports = mongoose.model('Category',categorySchema);    