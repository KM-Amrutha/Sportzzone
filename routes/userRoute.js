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
 const orderController= require('../controllers/orderController');
 

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

user_route.get('/productShop',auth.isBlockedoornot,userController.guestShopPage);
user_route.get('/productDetail',auth.isBlockedoornot,userController.guestProductDetailPage);


user_route.get('/register',auth.isLogout,userController.loadRegister); 
user_route.post('/register',userController.insertUser);

user_route.get('/loadLogin',auth.isLogout,userController.loadLogin);
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


user_route.get("/productShopPage",userController.loadshopPage);

user_route.get('/productDetail',userController.productdetailPage);

user_route.get('/filterbyCategory',userController.filterbyCategory);
user_route.get('/allCategory',userController.allCategory);
 

//---------------------cart------------//

user_route.get('/getCart',auth.isLogin,auth.isBlocked,cartController.getCart);
user_route.post('/addToCart',auth.isLogin,auth.isBlocked,cartController.addToCart);
user_route.post('/updatecart', cartController.updateCart);
user_route.post('/removeFromCart',auth.isLogin,auth.isBlocked,cartController.removeFromCart);
user_route.get('/loadCheckout',auth.isLogin,auth.isBlocked,cartController.isCartempty,cartController.loadCheckout);
user_route.post('/clearCart',auth.isLogin,auth.isBlocked,cartController.clearCart);


//--------------order--------------//
user_route.post('/placeOrder',auth.isLogin,auth.isBlocked,cartController.placeOrder);

user_route.post('/onlinepay',auth.isLogin,cartController.onlinepay);
user_route.post('/verifyPayment',auth.isLogin,auth.isBlocked,cartController.verifyPayment);
user_route.post('/failedOrder',auth.isLogin,auth.isBlocked,cartController.failedOrder);
user_route.post('/retryPayment/:id',auth.isLogin,auth.isBlocked,cartController.retryPayment);

user_route.post('/addtoWallet',auth.isLogin,auth.isBlocked,cartController.addtowallet);


user_route.get('/loadOrderPage',auth.isLogin,auth.isBlocked,orderController.loadOrderPage);
user_route.get('/orderDetailPage',auth.isLogin,auth.isBlocked,orderController.orderDetailPage);
user_route.post('/cancelOrder/:id',auth.isLogin,auth.isBlocked,orderController.cancelOrder);
user_route.post('/returnOrder/:orderId',auth.isLogin,auth.isBlocked,orderController.returnOrder);
user_route.get('/invoicePdf',auth.isLogin,auth.isBlocked,orderController.invoicePdf);

//---------------userprofile-----------//

user_route.get('/userProfile',auth.isLogin,auth.isBlocked,userController.userProfile);
user_route.post('/addAddress', auth.isLogin,auth.isBlocked, userController.addAddress);
user_route.get('/loadEditAddress', auth.isLogin,auth.isBlocked, userController.loadEditAddress);
user_route.post('/updateAddress', auth.isLogin,auth.isBlocked, userController.updateAddress);
user_route.post('/removeAddress',auth.isLogin,auth.isBlocked,userController.removeAddress);
user_route.get('/loadAddAddress',auth.isLogin,auth.isBlocked,userController.loadAddAddress);
user_route.post('/changePassword',auth.isLogin,auth.isBlocked,userController.changePassword);
user_route.post('/updateProfile', auth.isLogin,auth.isBlocked,userController.updateUserProfile);

//----------------sort & filter---------------------//

user_route.get('/lowtoHigh',userController.lowtoHigh);
user_route.get('/hightoLow',userController.hightoLow);
user_route.get('/AtoZ', userController.AtoZ);
user_route.get('/ZtoA',userController.ZtoA);


//coupon------------//

user_route.post('/applyCoupon',auth.isLogin,cartController.applyCoupon);
user_route.post('/removeCoupon', auth.isLogin,cartController.removeCoupon);
user_route.post('/selectCoupon', auth.isLogin, cartController.selectCoupon);

//wishlist----------------//

user_route.get('/loadWishlist',auth.isLogin,auth.isBlocked,userController.loadWishlist);
user_route.post('/wishlist/add', auth.isLogin, userController.addtoWishlist);
user_route.post('/removeWishlist', auth.isLogin, userController.removeWishlist);




module.exports = user_route;

