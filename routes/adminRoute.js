const express = require("express"); 
const admin_route  = express.Router()
const adminAuth = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");
const productController = require("../controllers/productController") ;
const categoryController = require("../controllers/categoryController");
const cartController = require('../controllers/cartController');
const oderController = require('../controllers/orderController');

const bodyParser = require("body-parser");
const session =  require("express-session");
const config = require("../config/config");

// const multer = require("multer");
const {upload} = require('../multer/multer')


admin_route.use(session({
    secret:config.sessionSecret,
    saveUninitialized:true,
    resave:false
}));

admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));

// admin_route.set('views','./views/admin'); 
// admin_route.set('view engine','ejs');
// admin_route.set('views', path.join(__dirname, '../views/admin'));


//routes for admin panel                                                                                                                                                                                                                                                +


admin_route.get('/',adminController.loadLogin);
admin_route.post('/',adminController.verifyLogin);

admin_route.get('/home',adminAuth.isLogin,adminController.loadDashboard);
admin_route.get('/logout',adminAuth.isLogin,adminController.logout);
// admin_route.get('/dashboard',adminAuth.isLogin,adminController.adminDashboard);

admin_route.get('/userList',adminAuth.isLogin,adminController.loaduserList);
admin_route.get('/ToggleblockUser',adminAuth.isLogin,adminController.ToggleblockUser)


admin_route.get('/addCategory',adminAuth.isLogin,categoryController.loadCategory);
admin_route.post('/loadCategory',adminAuth.isLogin,categoryController.addCategory)
admin_route.get('/loadeditCategory',adminAuth.isLogin,categoryController.loadeditCategory)
admin_route.post('/editCategory',adminAuth.isLogin,categoryController.editCategory)
admin_route.get('/ToggleblockCategory',adminAuth.isLogin,categoryController.ToggleblockCategory);






admin_route.get('/addproduct',adminAuth.isLogin,productController.loadaddProduct);
admin_route.post('/insertProduct',adminAuth.isLogin, upload.array('images',4), productController.productInsert);
admin_route.get('/productlist',adminAuth.isLogin,productController.productListview);



admin_route.get('/ToggleblockProduct',adminAuth.isLogin,productController.ToggleblockProduct)
admin_route.delete("/deleteImage",adminAuth.isLogin,productController.deleteImage);
admin_route.get('/loadeditProduct',adminAuth.isLogin,productController.loadeditProduct);
admin_route.post('/editProduct', adminAuth.isLogin, upload.array('images', 4), productController.editProduct);


//-----------------------order---------------//

admin_route.get('/loadOrder',adminAuth.isLogin,adminController.loadOrder);
admin_route.get('/loadOrderDetails',adminAuth.isLogin,adminController.loadOrderDetails);

admin_route.get('/orderPending',adminAuth.isLogin,adminController.orderPending);
admin_route.get('/orderShipped',adminAuth.isLogin,adminController.orderShipped);
admin_route.get('/orderDelivered',adminAuth.isLogin,adminController.orderDelivered);
admin_route.get('/orderCancelled',adminAuth.isLogin,adminController.orderCancelled);
admin_route.get('/orderReturned',adminAuth.isLogin,adminController.orderReturned);


//-----------------------Coupon------------------//

admin_route.get('/loadCoupon', adminAuth.isLogin,adminController.loadCoupon);
admin_route.post('/addCoupon',adminAuth.isLogin,cartController.addCoupon);
admin_route.get('/blockCoupon', adminAuth.isLogin,cartController.blockCoupon);
admin_route.post('/deleteCoupon', adminAuth.isLogin,cartController.deleteCoupon);


admin_route.get('/offers',adminAuth.isLogin,oderController.offers);
admin_route.post('/applyOffer',adminAuth.isLogin,oderController.applyOffer);

admin_route.post('/toggleOfferStatus',adminAuth.isLogin,oderController.toggleOfferStatus);

admin_route.get('/loadSalesReport',adminAuth.isLogin,adminController.loadSalesReport);
admin_route.post('/salesReportSearch', adminAuth.isLogin,adminController.salesReportSearch);



admin_route.get("*",function(req,res){
    // console.log("Current URL:", req.originalUrl);
    res.redirect('/admin')
})
module.exports = admin_route;
