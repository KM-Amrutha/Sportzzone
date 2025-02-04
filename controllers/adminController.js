const User =  require("../models/userModel");

 const bcrypt =  require('bcryptjs');
 const mongoose = require('mongoose')
//  const multer = require('multer');

const Product=require("../models/productModel");
const category = require("../models/categoryModel");
const Orders= require('../models/orderModel');
const coupon = require('../models/couponModel');
const xlsx = require('xlsx');


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
};

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

    const mostOrderedProducts = await Orders.aggregate([
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.productId",
          totalQuantity: { $sum: "$product.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
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

    const topSellingCategories = await Orders.aggregate([
      { $unwind: "$product" },
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.productCategory",
          totalQuantity: { $sum: "$product.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          categoryName: "$categoryDetails.catName", 
          totalQuantity: 1,
        },
      },
    ]);
    
    
    const deliveredOrders = await Orders.find({
      orderStatus: 'Delivered',
      paymentStatus: 'Received',
    });

  
    const monthlySalesData = new Array(12).fill(0);

    deliveredOrders.forEach(order => {
      const monthIndex = new Date(order.orderDate).getMonth(); // Get the month (0-11)
      monthlySalesData[monthIndex] += parseFloat(order.totalAmount); 
    });

    const topSellingMonths = await Orders.aggregate([
      {
        $match: {
          orderStatus: 'Delivered',
          paymentStatus: 'Received',
        },
      },
      {
        $group: {
          _id: { $month: "$orderDate" }, 
          totalOrders: { $sum: 1 }, 
        },
      },
      { $sort: { totalOrders: -1 } },
    ]);

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


const formattedTopSellingMonths = topSellingMonths.map(item => ({
  month: monthNames[item._id - 1],
  totalOrders: item.totalOrders,  
}));
    res.render("admin/adminHome", {
      user:userData,
      orderList,
      totalOrders: totalOrders.length,
      totalProducts: totalProducts.length,
      mostOrderedProducts,
      topSellingCategories,
      categories,
      salesData,
      monthlySalesData: JSON.stringify(monthlySalesData),
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
    
      const limit = 8; 
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
          const orders = await Orders.findOne({ _id:productId})
          .populate('product.productId')
          .populate('userId')

          if (!orders) {
            return res.status(404).send("Order not found");
          }
          
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
      res.redirect('/admin/loadOrders',
        orderPending
      )
  } catch (error) {
      console.log(error.message)
  }
}



const orderShipped= async(req,res)=>{
  try {
      const orderId= req.query.id
      const orderShipped =await Orders.findByIdAndUpdate(orderId,{$set:{ orderStatus:'Shipped'}})
       res.redirect('/admin/loadOrder',
        orderShipped
       )
  } catch (error) {
      console.log(error.message)
  }
}



const orderDelivered = async (req, res) => {
  try {
    const orderId = req.query.id;

    // Validate orderId
    if (!orderId) {
      return res.status(400).send("Order ID is required");
    }

    const updatedOrder = await Orders.findByIdAndUpdate(orderId, { 
      $set: { orderStatus: 'Delivered' } 
    });

    if (!updatedOrder) {
      return res.status(404).send("Order not found");
    }

    // Redirect to the admin loadOrder page
    res.redirect('/admin/loadOrder');
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};



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

  const page = parseInt(req.query.page) || 1;

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

    const orderList = await Orders.find({
       paymentStatus: "Received", orderStatus: "Delivered" })
      .sort({ orderDate: -1 })
      .populate('userId');

    res.render('admin/salesReport', 
      { orderList ,start: '', end: ''});
  } catch (error) {
    console.error(error.message);
  }
};


const salesReportSearch = async (req, res) => {
  try {
    const { start, end } = req.body;

  
    const startDate = new Date(start);
    const endDate = new Date(end);
  
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

   

  
    const orderList = await Orders.find({
      paymentStatus: 'Received',
      orderStatus: 'Delivered',
      orderDate: { $gte: startDate, $lte: endOfDay }
    }).populate('userId');

    res.render('admin/salesReport', { orderList, start, end });

  } catch (error) {
    console.error('Error fetching sales report:', error.message);
    res.status(500).send('Server error');
  }
};


///////////////////////////////////////////////////FRO CREATING CHART///////////////////////////////////////

const salesData = async (req,res)=>{
  try{

    const orders = await Orders.find({
       paymentStatus: 'Received',
      orderStatus: 'Delivered'
    }).select('orderDate totalAmount');

    const monthlySales = {}; 
    const weeklySales = {}; 
    const yearlySales = {};

    if (!Array.isArray(orders)) {
      console.error('Orders is not an array:', orders);
      return res.status(500).json({ error: 'Orders data format is invalid' });
    }


    orders.forEach(order => {


      const orderDate = new Date(order.orderDate);
    
      const week = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}-${Math.floor((orderDate.getDate() - 1) / 7) + 1}`;
      const month = orderDate.getMonth()+1;
      const year = orderDate.getFullYear();
       
      monthlySales[month] = (monthlySales[month] || 0) + parseFloat(order.totalAmount);
      weeklySales[week] = (weeklySales[week] || 0) + parseFloat(order.totalAmount);
      yearlySales[year] = (yearlySales[year] || 0) + parseFloat(order.totalAmount);

  });
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
};

const excelReport = async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = {
      paymentStatus: "Received",
      orderStatus: "Delivered",
    };

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      // Validate the dates
      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).send("Invalid date format");
      }

      query.orderDate = { $gte: startDate, $lte: endDate };
    }

    
    const orders = await Orders.find(query).populate("userId");


    const reportData = orders.map((order) => ({
      OrderID: order.orderId,
      Name: order.userId ? order.userId.name : "Guest user",
      PaymentMethod: order.paymentMethod,
      CouponDiscount: order.couponDiscount,
      TotalAmount: order.totalAmount,
      OrderDate: order.orderDate.toISOString().split("T")[0], 
    }));

    
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(reportData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    const excelBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-report-${start || "all"}-${end || "all"}.xlsx"`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting sales report:", error.message);
    res.status(500).send("Server error");
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
    loadCoupon,
    loadSalesReport,
    salesReportSearch,
    salesData,
    excelReport

 }