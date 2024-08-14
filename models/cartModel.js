const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({

    userId:{ type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},

     product:[
        {
            productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
            price:{type:Number},

            quantity:{type:Number,required:true} 
            
}
     ]
     
})

module.exports = mongoose.model('Cart',cartSchema)
  