const { ObjectId } = require('mongodb')

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.ObjectId,
        ref:'User',
        required:true
    },

  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true,
    
  },
     userId: { type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
  address: {
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
  
  zipcode:{
    type:Number,
    required:true
},
  mobile: {
    type: Number,
    required: true,
  }
},
  
{ timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);