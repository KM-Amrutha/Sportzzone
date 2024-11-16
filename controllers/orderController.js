const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Orders = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Razorpay = require('razorpay')

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
let instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});




const loadOrderPage = async (req, res) => {
  try {
    const userid = req.session.user_id;
    const userData = await User.findOne({ _id: userid });
    const addressData = await Address.findOne({ userId: userid });
    const cartData = await Cart.findOne({ userId: userid }).populate('product.productId');

    const orderId = req.query.id;
    const order = await Orders.findOne({ _id: orderId, userId: userid }).populate('product.productId');

    if (!order) {
      return res.status(404).send('Order not found');
    }
    order.product = order.product.map(product => {
      const offerPrice = product.productId.offerPrice;
      product.displayPrice = offerPrice || product.productId.productPrice;
      return product;
    });

    const couponDiscount = order ? order.couponDiscount : 0;
    const cartLength = cartData ? cartData.product.length : 0;

    res.render("users/orderSuccess", {
      order,
      user: userData,
      address: addressData,
      cartData,
      cartLength,
      couponDiscount
    });

  } catch (error) {
    console.error('Error loading order page:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

  
  
  const orderDetailPage = async(req,res)=>{
    try{
      const userid = req.session.user_id;
      const userData = await User.findOne({ _id: userid });
      const addressData = await Address.findOne({ userId: userid });
      const orderId = req.query.id; 
   
      const order = await Orders.findOne({_id: orderId, userId: userid }).populate('product.productId');
       order.product = order.product.map(product => {
        const offerPrice = product.productId.offerPrice;
        product.displayPrice = offerPrice || product.productId.productPrice;
        return product;
    });
      
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
        //payment methods check cheyyanum wallet anel cash athil keranum

        if (order.paymentMethod === 'cash on delivery') {
            console.log('Cash on Delivery order, no refund needed.');
        } else {
          const wallet = await Wallet.findOne({ userId: userId });

          if (!wallet) {
              throw new Error('User wallet not found');
          }

          const totalAmount = parseFloat(order.totalAmount);
          wallet.balance += totalAmount;
          
          wallet.transactionHistory.push({
              amount: totalAmount,
              type: 'Credit'
          });

          await wallet.save();

        }

        res.status(200).send('Order cancelled successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
};


const returnOrder = async (req, res) => {
  try {
      
    const userId = req.sessoin.user_id;

      const orderId = req.params.orderId;
      const wallet = await Wallet.findOne({ userId: userId });

      const orderReturned = await Orders.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Returned' } });
      const returnedOrder = await Orders.findById( orderId );
      
     
      if (!returnedOrder) {
          return res.status(404).send("Order not found");
      }
      const orderItems = returnedOrder.product;

      for (const item of orderItems) {
        const product = await products.findById(item.productId);

        if (product) {
            product.countStock += item.quantity; // Increase product stock
            await product.save();
        }
    }
    if (returnedOrder && wallet) {
      const totalAmount = parseFloat(returnedOrder.totalAmount);

      // Check if totalAmount is not zero
      if (totalAmount !== 0) {
          wallet.balance += totalAmount;
          wallet.transactionHistory.push({
              amount: totalAmount,
              type: 'Credit'
          });
          await wallet.save();
      }
      
        
    }
    else {
      throw new Error('Returned order or user wallet not found');
  }
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

    
    const updatedCategory = await category.findByIdAndUpdate(
      categoryId,
      { OfferisActive: isActive },  
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }


    const productsToUpdate = await products.find({ productCategory: categoryId });

    if (productsToUpdate.length === 0) {
      return res.status(404).json({ success: false, message: 'No products found for this category' });
    }

    
    for (const product of productsToUpdate) {
      if (isActive) {
        
        const discount = updatedCategory.offer; 
        const updatedPrice = Math.round(product.productPrice * ((100 - discount) / 100));
        product.offerPrice = updatedPrice;
      } else {
    
        product.offerPrice = product.productPrice;
      }

      
      await product.save();
    }

    
    res.json({ success: true, message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`, category: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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
   
}