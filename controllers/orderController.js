const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Orders = require('../models/orderModel');
const Razorpay = require('razorpay')

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
let instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});




const loadOrderPage = async (req, res) => {
    try {
      const userid = req.session.user_id;
      const orderId = req.query.id; 
   
      const order = await Orders.findOne({_id: orderId, userId: userid }).populate('product.productId');
  
      const userData = await User.findOne({ _id: userid });
      const addressData = await Address.findOne({ userId: userid });
      
      res.render("users/orderSuccess", {
        order, 
        user: userData,
        address: addressData,
       // cartData,
       // cartLength: cartLength,
      });
  
    } catch (error) {
      console.error('Error loading order page:', error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const orderDetailPage = async(req,res)=>{
    try{
      const userid = req.session.user_id;
      const orderId = req.query.id; 
   
      const order = await Orders.findOne({_id: orderId, userId: userid }).populate('product.productId');
  
      const userData = await User.findOne({ _id: userid });
      const addressData = await Address.findOne({ userId: userid });
      
      console.log('Address Data:', addressData); 
      
      res.render("users/orderDetailPage", {
        order, 
        user: userData,
        address: addressData,
       
      });
  
  
    } catch(error){
      console.error(error.message)
    }
  };


  const cancelOrder = async (req, res) => {
    
    try {
        const orderId = req.params.id;
        const userId = req.session.user_id;

        const order = await Orders.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.orderStatus === 'Cancelled') {
            return res.status(400).send('Order is already cancelled');
        }

        order.orderStatus = 'Cancelled';
        await order.save();

        for (const item of order.product) {
            const productItem = await products.findById(item.productId);
            if (productItem) {
                productItem.countStock += item.quantity;
                await productItem.save();
            }
        }

        console.log(`Payment method: ${order.paymentMethod}, Payment status: ${order.paymentStatus}`);
        if (order.paymentMethod === 'cash on delivery') {
            console.log('Cash on Delivery order, no refund needed.');
        }

        res.status(200).send('Order cancelled successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
};


const returnOrder = async (req, res) => {
  try {
      console.log("User is requesting a return");

      const orderId = req.params.orderId;

      const order = await Orders.findById(orderId);
      console.log(order);
      
      
      if (!order) {
          return res.status(404).send("Order not found");
      }

      if (order.orderStatus !== "Delivered") {
          return res.status(400).send('Only delivered orders can be returned');
      }

      order.orderStatus = "Returned";
      await order.save();

      console.log(order.orderStatus);

      
      res.status(200).send('Order returned successfully');
  } catch (error) {
    console.error('Error returning product:', error);
    res.status(500).send('An error occurred while returning the product');
  }
};



const offers = async (req, res) => {
  const page = req.query.page || 1; 
  const limit = 4; 
  const skip = (page - 1) * limit;

  try {
    const catData = await category.find().skip(skip).limit(limit); 
    const product = await products.find(); 
    
    const totalCategories = await category.countDocuments(); 
    const totalPages = Math.ceil(totalCategories / limit); 

    if (catData) {
      res.render('admin/adminOffer', {
        categories: catData,
        product,
        currentPage: page,
        totalPages: totalPages,
        limit
      });
    }

  } catch (error) {
    console.error(error.message);
    res.render('admin/adminOffer', { categories: [], product: [], error: 'Internal Server Error. Please try again.' });
  }
};


const applyOffer = async (req, res) => {
  try {
    const { categoryId, discount, expiry } = req.body;

    

    const OfferisActive = true;
    const numericDiscount = Number(discount);

    if (!categoryId || !numericDiscount || !expiry) {
      return res.status(400).json({ message: 'All fields are required: discount, expiry' });
    }

    if (numericDiscount < 0 || numericDiscount > 100) {
      return res.status(400).json({ message: 'Discount must be between 1 and 100' });
    }

    const expiryDate = new Date(expiry);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return res.status(400).json({ message: 'Expiry date must be a valid future date' });
    }

    const updatedCategory = await category.findByIdAndUpdate(
      categoryId,
      { offer: numericDiscount, expirationDate: expiryDate, OfferisActive },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const productsToUpdate = await products.find({ productCategory: categoryId });
    if (!productsToUpdate || productsToUpdate.length === 0) {
      return res.status(404).json({ message: 'No products found for this category' });
    }

    for (const product of productsToUpdate) {
      if (OfferisActive) {
        const updatedPrice = Math.round(product.productPrice * ((100 - numericDiscount) / 100));
        product.offerPrice = updatedPrice;
      } else {
        delete product.offerPrice;
      }
      await product.save();
    }

    return res.status(200).json({ message: 'Offer applied successfully', category: updatedCategory });
  } catch (error) {
    console.error('Error in applyOffer:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




const toggleOfferStatus = async (req, res) => {
  try {
    const { categoryId, isActive } = req.body;

    // Update the category's offer status
    const updatedCategory = await category.findByIdAndUpdate(
      categoryId,
      { OfferisActive: isActive },  // Use OfferisActive to represent the offer's active status
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Get all products in the category
    const productsToUpdate = await products.find({ productCategory: categoryId });

    if (productsToUpdate.length === 0) {
      return res.status(404).json({ success: false, message: 'No products found for this category' });
    }

    // Update the offer price for each product in the category based on the offer's active status
    for (const product of productsToUpdate) {
      if (isActive) {
        // If the offer is active, calculate the new offer price based on the category's offer discount
        const discount = updatedCategory.offer;  // Assuming offer contains the discount percentage
        const updatedPrice = Math.round(product.productPrice * ((100 - discount) / 100));
        product.offerPrice = updatedPrice;
      } else {
        // If the offer is inactive, reset the offer price to the original product price
        product.offerPrice = product.productPrice;
      }

      // Save the updated product
      await product.save();
    }

    // Respond with success
    res.json({ success: true, message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`, category: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const onlinePay = async(req,res)=>{
  try{

  } catch(error){
    console.error(error.message)
  }
};



  module.exports = {
    loadOrderPage,
   orderDetailPage,
   cancelOrder,
   returnOrder,
   offers,
   applyOffer,
   toggleOfferStatus,
  

   onlinePay


   
}