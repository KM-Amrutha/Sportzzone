const User =  require("../models/userModel");

 const bcrypt =  require('bcrypt');
 const mongoose = require('mongoose')
//  const multer = require('multer');

const Product=require("../models/productModel");
const category = require("../models/categoryModel");
const Orders= require('../models/orderModel');
const coupon = require('../models/couponModel');



// Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, path.join(__dirname, '../public/admin-assets/imgs/items'));
//   },
//   filename: function(req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });
// const upload = multer({ storage: storage });




const loadLogin = async(req,res)=>{
try{

    res.render('admin/login');
} catch (error){
    console.log(error.mesage); 
}
}

const verifyLogin = async(req,res)=>{
try{
  const Email = req.body.email;
  const password = req.body.password;
 
  const userData = await User.findOne({email:Email});
  if(userData){
     
  const passwordMatch = await bcrypt.compare(password,userData.password);
  if(passwordMatch){

    if(userData.is_admin===0){
        res.render('admin/login',{message:"Email and password is incorrect"})
    }else {
     req.session.admin_id= userData._id;
    res.redirect("/admin/home");

  }

 }
 else{
    res.render('admin/login',{message:"Email and password is incorrect"});
 }  

  }

}catch(error){
    console.error(error.message);
    res.render('admin/login',{message:"an error occured,please try again later"})
}


}


 


const loadDashboard = async(req,res)=>{
 try {

  const userData =  await  User.findById(req.session.admin_id);

    res.render('admin/adminHome', {user:userData})
 

}catch(error){
    console.log(error.message);
}
}
const loaduserList = async(req,res)=>{
  
    try{
       
       const user = await User.find({ is_admin: { $ne: 1 } });
       
      res.render("admin/userList",{user })
       
    }
    catch(error){
      console.error(error)
      res.status(500).send('Internal server error on userlist ')
    }
}


const ToggleblockUser = async (req,res)=>{
  try{
    const userId= req.query.userid
    const users = await User.findOne({_id:userId}); 

    if (!users) {
      return res.status(404).json({ success: false, error: 'user not found' });
  }
    users.is_Active =!users.is_Active
    await users.save()

    res.redirect("/admin/userList")
  } catch(error){
    console.error('Error in ToggleblockProduct:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const logout = async(req,res)=>{

try{
   req.session.admin_id=null;
   req.session.destroy();
   res.redirect('/admin');

}catch(error){
    console.log(error.message);
}
}

const loadOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8; 
    const skip = (page - 1) * limit; 

    
    const totalOrders = await Orders.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    
    const orders = await Orders.find()
      .populate('product.productId')
      .skip(skip)
      .limit(limit);

    
    res.render("admin/order", { 
      orders, 
      currentPage: page, 
      totalPages 
    }); 
  } catch (error) {
    console.error('Error loading admin orders page:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

const loadOrderDetails = async(req,res)=>{
  try{
          const productId = req.query.id
          const orders = await Orders.findOne({ _id:productId}).populate('product.productId')
          const orderData = await Orders.findOne({ _id:productId})
         
    res.render('admin/orderDetail', { orders, orderData });

  } catch(error){
    console.error(error.message)
  }
}

const orderPending= async(req,res)=>{
  try {
      const orderId= req.query.id
      const orderPending= await Orders.findByIdAndUpdate(orderId,{$set:{orderStatus:"Order Placed"}})
      res.redirect('/admin/loadOrders')
  } catch (error) {
      console.log(error.message)
  }
}



const orderShipped= async(req,res)=>{
  try {
      const orderId= req.query.id
      const orderShipped =await Orders.findByIdAndUpdate(orderId,{$set:{ orderStatus:'Shipped'}})
       res.redirect('/admin/loadOrder')
  } catch (error) {
      console.log(error.message)
  }
}



const orderDelivered=async(req,res)=>{
  try {
      const orderId= req.query.id
      const orderDelivered= await  Orders.findByIdAndUpdate(orderId,{$set:{orderStatus:'Delivered'}})
       res.redirect('/admin/loadOrder')
  } catch (error) {
      console.log(error.message)
  }
}



const orderReturned=async(req,res)=>{
  try {
      const orderId= req.query.id
      const orderReturned= await  Orders.findByIdAndUpdate(orderId,{$set:{orderStatus:'Returned'}})
      res.redirect('/admin/loadOrder')
  } catch (error) {
      console.log(error.message)
  }
}

const orderCancelled=async(req,res)=>{
  try {
      const orderId= req.query.id
      const OrderCancelled= await Orders.findByIdAndUpdate(orderId,{$set:{orderStatus:'Cancelled'}})
      res.redirect('/admin/loadOrder')
  } catch (error) {
      console.log(error.message)
  }
}

const loadCoupon = async (req, res) => {
  const page =  req.query.page || 1;
  const limit = 4; 
  const skip = (page - 1) * limit; 

  try {
      const couponData = await coupon.find().sort({ Date: -1 }).skip(skip).limit(limit); 
      const totalCoupons = await coupon.countDocuments(); 
      const totalPages= Math.ceil(totalCoupons / limit) 

      res.render('admin/coupon', {
          couponData,
          error: null,
          currentPage: page,
          totalPages: totalPages,
          limit: limit
      });
  } catch (error) {
      console.error(error.message);
      res.render('admin/coupon', { couponData: [], error: 'Internal Server Error. Please try again.' });
  }
};

 module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    loaduserList,
    ToggleblockUser,
    loadOrder,
    loadOrderDetails,
    orderPending,
    orderShipped,
    orderDelivered,
    orderReturned,
    orderCancelled,
    loadCoupon

   
 }