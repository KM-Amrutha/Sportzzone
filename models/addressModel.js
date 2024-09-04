const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.ObjectId,
        ref:'User',
        required:true
    },
  name: {
    type: String,
    required: true
  },
  mobile:{
    type: Number,
    required:true
  },
  houseName: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },

  state: {
    type: String,
    required: true,
  },
  
  pincode:{
    type:Number,
    required:true
},
  
},
  
{ timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);