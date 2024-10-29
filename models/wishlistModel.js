const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId : {type:mongoose.Schema.Types.ObjectId,required:true,ref:'User'},
    product:[
        {
            productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
            quantity:{type:Number,required:true} 
            
}
    ]
});
module.exports = mongoose.model('wishlist',wishlistSchema);
