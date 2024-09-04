 const express = require("express");
 const user_route = express()
 const session = require ("express-session");
//  const multer = require('multer')
 const path = require("path");
 const auth = require("../middleware/auth")
 const bodyParser = require ('body-parser');
 const userController = require('../controllers/userController');
 const categoryController= require('../controllers/categoryController');
 const cartController = require('../controllers/cartController');
 

 const config = require("../config/config");
const { markAsUntransferable } = require("worker_threads");


user_route.use(bodyParser.json()); 
user_route.use(bodyParser.urlencoded({extended:true})); 
 
 

//   user_route.set('view engine','ejs');
//  user_route.set('views','./views/users');

// user_route.set('views', path.join(__dirname, '../views/admin'));

 // static files middleware
user_route.use(express.static('public'));


user_route.get('/',userController.homewithoutLogin);
user_route.get('/users/productShop',auth.isBlockedoornot,userController.guestShopPage);
user_route.get('/productDetail',auth.isBlockedoornot,userController.guestProductDetailPage);


user_route.get('/register',auth.isLogout,userController.loadRegister); 
 user_route.post('/register',userController.insertUser);

user_route.get('/',auth.isLogout,userController.loginLoad);
user_route.get('/login',auth.isLogout,userController.loginLoad);
user_route.post('/login',userController.verifyLogin);
user_route.get('/home',auth.isBlocked,userController.loadHome);
user_route.get('/logout',auth.isLogin,userController.userLogout);



// New routes for OTP verification
user_route.get('/otp', userController.loadVerifyOTP); 
user_route.post('/verify-otp', userController.verifyOTP);  

//resned OTP again athinulla route..// 
user_route.post('/resend-otp', userController.resendOTP);



// Forgot Password routes
user_route.get('/forgot-password',auth.isLogout, userController.loadForgotPassword);
user_route.post('/forgot-password',auth.isLogout, userController.postForgotPassword);
user_route.get('/newOtp',auth.isLogout,userController.newOtp);
user_route.post('/newOtp', auth.isLogout,userController.verifyNewOtp);
user_route.post('/newPassword',auth.isLogout,userController.verifyPassword)


//----------------------------category-----------//
user_route.get('/filterCategory',auth.isLogin,auth.isBlocked,categoryController.filterCategory)

user_route.get("/users/productShop",auth.isLogin,auth.isBlocked,userController.loadshopPage);
user_route.get('/productDetail',auth.isLogin,auth.isBlocked,userController.productdetailPage);


//---------------------cart------------//

user_route.get('/getCart',auth.isLogin,auth.isBlocked,cartController.getCart);
user_route.post('/addToCart',auth.isLogin,auth.isBlocked,cartController.addToCart);
user_route.post('/updatecart', cartController.updateCart);
user_route.post('/removeFromCart',auth.isLogin,auth.isBlocked,cartController.removeFromCart);
user_route.get('/loadCheckout',auth.isLogin,auth.isBlocked,cartController.isCartempty,cartController.loadCheckout);
user_route.post('/placeOrder',auth.isLogin,auth.isBlocked,cartController.placeOrder);
user_route.get('/loadOrderPage',auth.isLogin,userController.loadOrderPage);






user_route.get('/userProfile',auth.isLogin,auth.isBlocked,userController.userProfile);
user_route.post('/addAddress', auth.isLogin,auth.isBlocked, userController.addAddress)
user_route.get('/loadEditAddress', auth.isLogin,auth.isBlocked, userController.loadEditAddress);
user_route.post('/updateAddress', auth.isLogin,auth.isBlocked, userController.updateAddress);
user_route.post('/removeAddress',auth.isLogin,auth.isBlocked,userController.removeAddress);

user_route.get('/loadAddAddress',auth.isLogin,auth.isBlocked,userController.loadAddAddress);


user_route.post('/changePassword',auth.isLogin,auth.isBlocked,userController.changePassword);

user_route.post('/updateProfile', auth.isLogin,auth.isBlocked,userController.updateUserProfile);



module.exports = user_route;