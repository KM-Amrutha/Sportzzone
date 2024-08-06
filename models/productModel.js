const mongoose = require('mongoose');



const productSchema = new mongoose.Schema({

  productName: {
    type: String,
    required: true
  },
  productDescription: {
    type: String,
    required: true,
    
  },
     productCategory: { type: mongoose.Schema.Types.ObjectId,
     ref: 'Category',
     required: true
  },
  productBrand: {
    type: String,
    required: true,
  },
  productPrice: {
    type: Number,
    required: true,
  },

  countStock: {
    type: Number,
    required: true,
  },
  
  listed: {
    type: Boolean,
    default: false
   
  },
  is_Active:{
    type:Boolean,
    default:true
},
  images: {
    type: [String],
    required: true,
  }
},
  // rating: {
  //   type: Number,
  //   min: 0,
  //   max: 5
  // }, 
{ timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
