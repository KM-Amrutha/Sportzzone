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

// const loadDashboard = async(req,res)=>{
//  try {
//   const orderList= await Orders.find().sort({orderDate:-1}).populate('userId')
//   const totalOrders= await Orders.find().populate('userId')
//   const totalProducts= await Product.find()
//   const categories= await category.find()

//   const salesData= await Orders.find({ paymentStatus: 'Recieved', orderStatus: 'Delivered' }).sort({orderDate:-1}).populate('userId')

//   // const userData =  await  User.findById(req.session.admin_id);
// //most ordered products

// const mostOrderedProducts = await Orders.aggregate([
//   { $unwind: "$product" },
//   { $group: { _id: "$product.productId", totalQuantity: { $sum: "$product.quantity" } } },
//   { $sort: { totalQuantity: -1 } },
//   { $limit: 5 },
//   { $lookup: { from: "product", localField: "_id", foreignField: "_id", as: "product" } }, // Populate product details
//   { $unwind: "$product" },
//   { $project: { _id: "$product._id", title: "$product.title", totalQuantity: 1 } }
// ]).limit(10);

//     res.render('admin/adminHome', {user:userData})
 

// }catch(error){
//     console.log(error.message);
// }
// }

const loadDashboard = async (req, res) => {
  try {
    const userData =  await  User.findById(req.session.admin_id);
    const orderList = await Orders.find().sort({ orderDate: -1 }).populate('userId');
    const totalOrders = await Orders.find().populate('userId');
    const totalProducts = await Product.find();
    const categories = await category.find();

    const salesData = await Orders.find({
      paymentStatus: 'Received',
      orderStatus: 'Delivered'
    }).sort({ orderDate: -1 }).populate('userId');



    // console.log('orderlist:',orderList.length);
    // console.log('totalOrders:',totalOrders);
    // console.log('totalproducts:',totalProducts);
    // console.log('categories:', categories);
    // console.log('salesData',salesData);

    // Most Ordered Products Aggregation
    const mostOrderedProducts = await Orders.aggregate([
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.productId",
          totalQuantity: { $sum: "$product.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: "$productDetails._id",
          productName: "$productDetails.productName",
          totalQuantity: 1,
        },
      },
    ]);

    // Top-Selling Categories Aggregation
    const topSellingCategories = await Orders.aggregate([
      { $unwind: "$product" }, // Unwind the product array
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, // Unwind the productDetails
      {
        $group: {
          _id: "$productDetails.productCategory", // Group by product category
          totalQuantity: { $sum: "$product.quantity" }, // Sum the quantities for each category
        },
      },
      { $sort: { totalQuantity: -1 } }, // Sort by total quantity
      { $limit: 5 }, // Limit to top 5 categories
      {
        $lookup: {
          from: "categories", // Join with categories collection
          localField: "_id", // _id refers to productCategory
          foreignField: "_id", // Match with category _id
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" }, // Unwind categoryDetails
      {
        $project: {
          categoryName: "$categoryDetails.name", // Get category name
          totalQuantity: 1, // Keep total quantity
        },
      },
    ]);


    // console.log("Most ordered products:", mostOrderedProducts);
        // console.log("Top selling Categories:",topSellingCategories)

    // Monthly Sales Data Aggregation
    const deliveredOrders = await Orders.find({
      orderStatus: 'Delivered',
      paymentStatus: 'Received',
    });

    // Initialize monthly sales data array with zeros for each month (Jan to Dec)
    const monthlySalesData = new Array(12).fill(0);

    deliveredOrders.forEach(order => {
      const monthIndex = new Date(order.orderDate).getMonth(); // Get the month (0-11)
      monthlySalesData[monthIndex] += parseFloat(order.totalAmount); // Add the order's total amount to the corresponding month
    });

// Top-Selling Months Aggregation
const topSellingMonths = await Orders.aggregate([
  {
    $match: {
      orderStatus: 'Delivered',
      paymentStatus: 'Received',
    },
  },
  {
    $group: {
      _id: { $month: "$orderDate" }, // Group by month
      totalSales: { $sum: "$totalAmount" }, // Sum total sales for each month
    },
  },
  { $sort: { totalSales: -1 } }, // Sort by total sales in descending order
]);

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Map the month index to month names
const formattedTopSellingMonths = topSellingMonths.map(item => ({
  month: monthNames[item._id - 1], // Convert month index (1-12) to month name
  totalSales: item.totalSales,
}));

// console.log("Top-Selling Months:", formattedTopSellingMonths);




    // Send the data to the frontend (or render the dashboard view if using templates)
    res.render("admin/adminHome", {
      user:userData,
      orderList,
      totalOrders: totalOrders.length,
      totalProducts: totalProducts.length,
      mostOrderedProducts,
      topSellingCategories,
      categories,
      salesData,
      monthlySalesData: JSON.stringify(monthlySalesData), // Pass the sales data to the front end
      topSellingMonth:formattedTopSellingMonths
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error loading dashboard",
      error: error.message,
    });
  }
};



const loaduserList = async (req, res) => {
  try {
    
      const limit = 10; 
      const page = parseInt(req.query.page) || 1; 
      const skip = (page - 1) * limit; 

      const user = await User.find({ is_admin: { $ne: 1 } })
          .skip(skip)
          .limit(limit);

      const totalUsers = await User.countDocuments({ is_admin: { $ne: 1 } });
      const totalPages = Math.ceil(totalUsers / limit);
      res.render('admin/userList', {
          user, 
          currentPage: page, 
          totalPages,
          limit
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error on user list');
  }
};



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
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)

      orders.sort((a,b)=>b-a);

    
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

const loadSalesReport = async(req, res) => {
  try {

    const orderList = await Orders.find({ paymentStatus: "Received", orderStatus: "Delivered" })
      .sort({ orderDate: -1 })
      .populate('userId');

    res.render('admin/salesReport', { orderList });
  } catch (error) {
    console.error(error.message);
  }
};

const salesReportSearch = async(req,res)=>{
  try{
    const { start, end } = req.body; 
    const endOfDay = new Date(end);
     endOfDay.setHours(23, 59, 59, 999);
   
    const orderList = await Orders.find({
        paymentStatus: 'Recieved', orderStatus: 'Delivered',
        orderDate: { $gte: new Date(start), $lte: endOfDay }
    }).populate('userId');

   
    res.render('admin/salesReport', { orderList,start,end }); 

  } catch(error){
    console.error(error.message);
  }
};

///////////////////////////////////////////////////FRO CREATING CHART///////////////////////////////////////

const salesData = async (req,res)=>{
  try{

    const orders = Orders.find({
       paymentStatus: 'Recieved',
      orderStatus: 'Delivered'
    }).select('orderDate totalAmount');

    const monthlySales = {}; 
    const weeklySales = {}; 
    const yearlySales = {};


    orders.forEach(order => {


      const orderDate = new Date(order.orderDate);
      console.log('orderDate:', orderDate);
      const week = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}-${Math.floor((orderDate.getDate() - 1) / 7) + 1}`;
      console.log("week:",week);

      const month = orderDate.getMonth()+1;
      console.log("month:",month);
      // Week format: YYYY-MM-WW
      const year = orderDate.getFullYear();
      console.log("year:",year);// Full year (e.g., 2023)    
     

      // Monthly sales
      monthlySales[month] = (monthlySales[month] || 0) + parseFloat(order.totalAmount);
      console.log("monthly sales:",monthlySales)

      // Weekly sales
      weeklySales[week] = (weeklySales[week] || 0) + parseFloat(order.totalAmount);
      console.log("weekly sales:",weeklySales)

      // Yearly sales
      yearlySales[year] = (yearlySales[year] || 0) + parseFloat(order.totalAmount);
      console.log("yearly sales:",yearlySales)
  });

  // Return sales data
  res.json({
      monthly: monthlySales,
      weekly: weeklySales,
      yearly: yearlySales
  });
  }
  catch(error){
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });

  }
}



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
    loadCoupon,
    loadSalesReport,
    salesReportSearch,
    salesData

 }