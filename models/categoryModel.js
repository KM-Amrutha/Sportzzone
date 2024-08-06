const mongoose=require("mongoose")
// mongoose.connect("mongodb://localhost:27017/E-Commerce")

const categorySchema = new mongoose.Schema({

    catNum:{
        type: Number,
        reuired:true
    },
catName:{
   type:String,
   required:true 
},
description:{
    type:String,
    required:true
},
is_Active:{
    type:Boolean,
    default:true
}

})

module.exports = mongoose.model('Category',categorySchema);    