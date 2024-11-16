const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

    userId:{ type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},

     product:[
        {
            productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
            price:{type:Number},

            quantity:{type:Number,required:true} ,

            productStatus:{type:String,enum:["Order Placed","Cancelled","Returned"],default:"Order Placed"}
            
}],
address: {
    name: { type: String },
    mobile: { type: Number },
    houseName: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: Number },

},
     
orderId: { type: String },
orderDate: { type: Date, default: Date.now },
totalAmount: { type: Number },
paymentMethod: { type: String },
paymentStatus: { type: String, enum: ['Pending', 'Received', 'Failed'], default: "Pending" },
orderStatus: { type: String, enum: ['Order Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'], default: "Order Placed" },
deliveryStatus: { type: Number, default: 0 },

})

module.exports = mongoose.model('orders',orderSchema);
