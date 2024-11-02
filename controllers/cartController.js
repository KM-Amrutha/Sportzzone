const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Orders = require('../models/orderModel');
const cart = require('../models/cartModel');
const coupon = require('../models/couponModel');
const Wishlist = require('../models/wishlistModel');

const Wallet = require('../models/walletModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');

require('dotenv').config();

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;


let instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});



const onlinepay = async (req, res) => {
    try {
        
        const userId = req.session.user_id;
        
        let productDataToSave;
        let addresses = await Address.findById(req.body.address);
        const cartData = await cart.findOne({ userId });


        if (!cartData || !cartData.product || cartData.product.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found." });
        }

        function generateOrderId() {
            const timestamp = Date.now().toString();
            const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let orderId = 'ORD';
            while (orderId.length < 6) {
                const randomIndex = Math.floor(Math.random() * randomChars.length);
                orderId += randomChars.charAt(randomIndex);
            }
            return orderId + timestamp.slice(-6);
        }

        const newOrderId = generateOrderId();
        


        if (req.session.buyNowProductId) {
            const product = await products.findById(req.session.buyNowProductId)
            if (product) {
                productDataToSave = [{
                    productId: product._id,
                    quantity: 1,
                    price: product.productPrice
                }];
                delete req.session.buyNowProductId;
                await req.session.save();
            } else {
                return res.status(400).json({ message: "Product not found for Buy Now." });
            }
        } else {
            productDataToSave = cartData.product; 
        }

        // Coupon discount
        let couponDiscount = 0;
        const { couponCode } = req.body;
        if (couponCode) {
            const couponDetails = await coupon.findOne({ couponCode });
            if (couponDetails) {
                couponDiscount = couponDetails.discountAmount;
            }
        }

        // Save order in the system with "pending" status
        const newOrder = new Orders({
            orderId:newOrderId,
            userId,
            address: addresses,
            paymentMethod: req.body.paymentMethod,
            paymentStatus: 'Pending',
            totalAmount: req.body.amount,
            couponDiscount,
            product: productDataToSave
            
        });

        await newOrder.save();
        const razorpayOrder = await instance.orders.create({
            amount: req.body.amount *100,
            currency: "INR",
            receipt: newOrder._id.toString(),
        });
        
        res.json({ razorpayOrder, order: newOrder });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const saveOrder = async (req, res) => {
    try {
        const { id } = req.query; 
        const paymentData = req.body;

    
        const updatedOrder = await Orders.findByIdAndUpdate(id, {
            paymentStatus: paymentData.paymentStatus,
            razorpayPaymentId: paymentData.razorpayPaymentId,
            updatedAt: new Date()
        }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found." });
        }

        res.status(200).json({ message: "Order updated successfully." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        console.log('User ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in to add products to your cart.' });
        }

        const productId = req.body.productId;
        console.log('Product ID:', productId);
        
        const product = await products.findById(productId).populate('productCategory');
        console.log('Product:', product);

        if (!product || product.countStock === 0) {
            return res.status(404).json({ success: false, message: 'Product is out of stock' });
        }

        const categoryOfferActive = product.productCategory.OfferisActive;
        console.log('Category Offer Active:', categoryOfferActive);

        let Cart = await cart.findOne({ userId });
        console.log('Cart:', Cart);

        if (!Cart) {
            Cart = new cart({ userId, product: [] });
            console.log('New cart created');
        }

        const existingProductIndex = Cart.product.findIndex(item => item.productId.toString() === productId);

        const priceToSave = categoryOfferActive ? product.offerPrice : product.productPrice;
        console.log('Price being saved to cart:', priceToSave);

        if (existingProductIndex !== -1) {
            const totalQuantity = Cart.product[existingProductIndex].quantity + 1;
            console.log('Total Quantity after increment:', totalQuantity);

            if (totalQuantity > 5) {
                return res.status(400).json({ success: false, message: 'You can only add up to 5 of the same product to your cart.' });
            }

            if (totalQuantity > product.countStock) {
                return res.status(400).json({ success: false, message: 'Cannot add more items than available stock' });
            }

            Cart.product[existingProductIndex].quantity = totalQuantity;
            Cart.product[existingProductIndex].price = priceToSave; 
            console.log('Updated product in cart:', Cart.product[existingProductIndex]);
        } else {
            Cart.product.push({ productId, quantity: 1, price: priceToSave });
            console.log('New product added to cart:', Cart.product[Cart.product.length - 1]);
        }

        await Cart.save();
        console.log('Cart after saving:', Cart);

        const wishlist = await Wishlist.findOne({ userId });
        if (wishlist) {
            wishlist.product = wishlist.product.filter(item => item.productId.toString() !== productId);
            await wishlist.save();
            console.log('Product removed from wishlist:', productId);
        }

        res.status(200).json({ success: true, message: 'Added to cart' });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the product to the cart.' });
    }
};

const updateCart = async (req, res) => {
    try {
        const { productId, direction } = req.body;
        const currentUserId = req.session.user_id;
        let userCart = await cart.findOne({ userId: currentUserId });

        const cartItemIndex = userCart.product.findIndex(item => item.productId.toString() === productId);

        if (cartItemIndex !== -1) {
            const currentProduct = await products.findById(productId).populate('productCategory');
            const categoryOfferActive = currentProduct.productCategory.OfferisActive;

            // Set the base price to offerPrice if the offer is active, else productPrice
            const basePrice = categoryOfferActive ? currentProduct.offerPrice : currentProduct.productPrice;

            // console.log('Base price before update:', basePrice); 

            const maxQuantityPerPerson = 5;

            if (direction === 'up') {
                // Increase logic
                if (userCart.product[cartItemIndex].quantity < maxQuantityPerPerson &&
                    userCart.product[cartItemIndex].quantity < currentProduct.countStock) {
                    
                    userCart.product[cartItemIndex].quantity++;
                    userCart.product[cartItemIndex].price = basePrice * userCart.product[cartItemIndex].quantity;

                    // console.log('Price after increase:', userCart.product[cartItemIndex].price); // Log updated price after increase
                } else if (userCart.product[cartItemIndex].quantity >= maxQuantityPerPerson) {
                    return res.json({ error: 'Cannot add more than the maximum allowed quantity' });
                } else {
                    return res.json({ error: 'Item is out of stock' });
                }
            } else if (direction === 'down') {
                // Decrease logic
                if (userCart.product[cartItemIndex].quantity > 1) {
                    userCart.product[cartItemIndex].quantity--;
                    userCart.product[cartItemIndex].price = basePrice * userCart.product[cartItemIndex].quantity;

                    // console.log('Price after decrease:', userCart.product[cartItemIndex].price); // Log updated price after decrease
                }
            }

            await userCart.save();
            // console.log('Cart after update:', userCart);

            return res.json({ 
                success: true, 
                cart: userCart,
                message: 'Cart updated successfully'
            });
        } else {
            console.log('Product not found in cart');
            return res.status(404).json({ error: 'Product not found in cart' });
        }
    } catch (error) {
        console.error('Error in updateCart:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};




const getCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const userData = await User.findOne({ _id: userId });

        if (!userData) {
            return res.status(404).send("User not found");
        }

        const cartData = await cart.findOne({ userId: userId }).populate('product.productId');

        
        if (!cartData || !cartData.product || cartData.product.length === 0) {
            return res.render("users/cart", { cartData: [], name: userData.name, cartLength: 0, totalPrice: 0 });
        }

        const cartLength = cartData.product.length;

        let totalPrice = 0;

        cartData.product.forEach(item => {
            totalPrice += item.productId.offerPrice && item.productId.offerPrice < item.productId.productPrice
                ? item.productId.offerPrice * item.quantity
                : item.productId.productPrice * item.quantity;
        });

        res.render("users/cart", { cartData, name: userData.name, cartLength, totalPrice });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};


const removeFromCart= async(req,res)=>{
    try{ 
    const { productId } = req.body;
    const userId = req.session.user_id;
    let Cart = await cart.findOne({ userId });
    if (!Cart) {
        console.log("cart not found")
    }
    const productIndex = Cart.product.findIndex(item => item.productId.toString() === productId);
    if (productIndex !== -1) {
        Cart.product.splice(productIndex, 1);
        const updateCart = await Cart.save();
        return res.status(200).send('Product removed from the cart');
    } else {
        return res.status(404).send('Product not found in the cart');
    }



    } catch(error){
        console.error(error.message)
    }
}

const isCartempty = async(req,res,next)=>{
    try{
        const userId = req.session.user_id;
        const Cart = await cart.findOne({ userId });
        if (!Cart || Cart.product.length === 0) {
            res.redirect('/home')
        } else {
            next()
        }

    }
    catch(error){
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const loadCheckout = async (req, res) => {
    try {
        let userId = req.session.user_id;
        const userData = await User.findOne({ _id: userId });
        const addressData = await Address.find({ userId: userId });
        const cartData = await cart.findOne({ userId: userId }).populate('product.productId');
        const cartLength = cartData ? cartData.product.length : 0;

        let grandTotal = 0;
        if (cartData && cartData.product.length > 0) {
            cartData.product.forEach(item => {
                grandTotal += item.productId.productPrice * item.quantity;
            });
        }

        const currentDate = new Date();
        const availableCoupons = await coupon.find({
            isActive: true,
            expirationDate: { $gte: currentDate }
        });

        const validCoupons = availableCoupons.filter(coupon => {
            const isMinPurchaseValid = grandTotal >= coupon.minimumPurchase;
            const isUserEligible = !coupon.redeemedUsers.some(user => user.userId === String(userId));
            return isMinPurchaseValid && isUserEligible;
        });

        res.render('users/checkout', { 
            name: userData.name, 
            cartData, 
            addresses: addressData,
            cartLength, 
            grandTotal, 
            availableCoupons: validCoupons 
        });

    } catch (error) {
        console.log('Error during checkout load:', error); // Log the error details
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const placeOrder = async (req, res) => {
    try {

        const userId = req.session.user_id;
        const { couponCode, paymentMethod } = req.body;

        const userCart = await cart.findOne({ userId });
        const address = await Address.find({ userId });

        // Handle missing or empty cart
        if (!userCart || userCart.product.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found." });
        }

        const appliedCoupon = await coupon.findOne({ couponCode, OfferisActive: true, expirationDate: { $gte: Date.now() } });

        function generateOrderId() {
            const timestamp = Date.now().toString();
            const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let orderId = 'ORD';
            while (orderId.length < 6) {
                const randomIndex = Math.floor(Math.random() * randomChars.length);
                orderId += randomChars.charAt(randomIndex);
            }
            return orderId + timestamp.slice(-6);
        }

        const newOrderId = generateOrderId();
        console.log("11");
        let couponDiscount = 0;

        if (appliedCoupon) {
            couponDiscount = appliedCoupon.discountAmount;
        }

        let productDataToSave;
        if (req.session.buyNowProductId) {
            const buyNowProduct = await products.findById(req.session.buyNowProductId);

            // Handle missing product in "buy now"
            if (!buyNowProduct) {
                return res.status(400).json({ message: "Product not found." });
            }
            console.log("22");

            const offerPrice = buyNowProduct.offer ? buyNowProduct.offer.offerPrice : buyNowProduct.productPrice;
            productDataToSave = [{
                productId: buyNowProduct._id,
                quantity: 1,
                price: buyNowProduct.productPrice,
                offerPrice: offerPrice
            }];

            if (buyNowProduct.countStock > 0) {
                buyNowProduct.countStock -= 1;
                await buyNowProduct.save();
            } else {
                return res.status(400).json({ message: `Insufficient stock for ${buyNowProduct.productName}` });
            }
            
            delete req.session.buyNowProductId;
            await req.session.save();

            console.log("33");
        } else {
            productDataToSave = await Promise.all(userCart.product.map(async (item) => {
                const product = await products.findById(item.productId);

                // Handle missing product in cart
                if (!product) {
                    return res.status(400).json({ message: `Product not found: ${item.productId}` });
                }
                console.log("44");
                const offerPrice = product.offer ? product.offer.price : product.productPrice;
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.productPrice,
                    offerPrice: offerPrice
                };
            }));
        }



        // Wallet Payment Logic
        let paymentStatus = "Pending";
        if (paymentMethod === "Wallet") {
            const userWallet = await Wallet.findOne({ userId });
            if (userWallet && userWallet.balance >= req.body.amount) {
                paymentStatus = "Received";
                userWallet.balance -= req.body.amount;
                userWallet.history.push({ amount: req.body.amount, type: 'debit' });
                await userWallet.save();
            } else {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
        }

        console.log("55");
        // Razorpay Payment Integration
        if (paymentMethod === "Razorpay") {
            const razorpayOrder = await instance.orders.create({
                amount: req.body.amount , // amount in smallest currency unit
                currency: "INR",
                receipt: newOrderId,
            });

            // Store Razorpay orderId
            req.session.razorpayOrderId = razorpayOrder.id;
            paymentStatus = "Pending";
        }

        const order = new Orders({
            orderId: newOrderId,
            userId,
            paymentMethod,
            paymentStatus,
            totalAmount: req.body.amount,
            product: productDataToSave,
            address,
            couponDiscount
        });
        console.log("66");
        await order.save();

        // Update stock after placing order
        if (!req.session.buyNowProductId) {
            for (const item of productDataToSave) {
                const orderProduct = await products.findById(item.productId);

                if (orderProduct) {
                    if (orderProduct.countStock >= item.quantity) {
                        orderProduct.countStock -= item.quantity;
                        await orderProduct.save();
                    } else {
                        return res.status(400).json({ message: `Insufficient stock for product: ${orderProduct.productName}` });
                    }
                }
            }

            // Clear the cart after successful order placement
            await cart.deleteOne({ userId });
        }
        console.log("77");
        res.status(200).json({ message: "Order Placed Successfully", orderId: order._id });
    } catch (error) {
        console.error("Error in placeOrder:", error.message);
        res.status(500).json({ message: "Something went wrong!" });
    }
};







const addCoupon = async (req, res) => {

    if (!req.session.admin_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
    }
    
    let couponData = [];
    try {
        const { couponName, couponCode, minimumPurchase, discountAmount, expirationDate } = req.body;
        
        if (!couponName || !couponCode || !minimumPurchase || !discountAmount || !expirationDate) {
            return res.status(400).render('admin/coupon', { couponData, error: 'All fields are required.' });
        }

        // Check for valid coupon name format
        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(couponName)) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Coupon name should only contain alphabets and spaces.' });
        }

        // Check if coupon code length is valid
        if (couponCode.length < 3 || couponCode.length > 20) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Coupon code must be between 3 and 20 characters long.' });
        }

        // Check expiration date validity
        const today = new Date();
        const expiryDate = new Date(expirationDate);
        if (isNaN(expiryDate.getTime()) || expiryDate <= today) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Expiration date must be a future date.' });
        }

        // Check if coupon already exists
        const existingCoupon = await coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Coupon code already exists.' });
        }

        // Validate minimum purchase and discount amounts
        const minPurchaseValue = parseFloat(minimumPurchase);
        const discountValue = parseFloat(discountAmount);

        if (isNaN(minPurchaseValue) || minPurchaseValue < 100) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Minimum purchase amount must be at least Rs. 100.' });
        }
        if (isNaN(discountValue) || discountValue <= 0 || discountValue >= minPurchaseValue) {
            return res.status(400).render('admin/coupon', { couponData, error: 'Discount amount must be a positive number and less than the minimum purchase amount.' });
        }


        const newCoupon = new coupon({
            couponName,
            couponCode,
            minimumPurchase: minPurchaseValue,
            discountAmount: discountValue,
            expirationDate,
            is_Active: true
        });
        await newCoupon.save();

        const page =  parseInt( req.query.page || 1) ;
        const limit = 4;
        const skip = (page - 1) * limit;

        
        couponData = await coupon.find().sort({ Date: -1 }).skip(skip).limit(limit);
        const totalCoupons = await coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit); 
         
        if (couponData.length === 0 && page > 1) {
            return res.redirect('/admin/coupons?page=1');
        }

        return res.render('admin/coupon', {
            couponData, 
            error: null,
            currentPage: parseInt(page), 
            totalPages ,
            limit

         });
    }catch (error) {
        console.error('Error adding coupon:', error);
        return res.status(500).render('admin/coupon', { 
            couponData, 
            error: 'Internal server error', 
            currentPage: 1, 
            totalPages: 1 ,
            limit: 4

        });
    }
};


const blockCoupon = async (req, res) => {
    try {
        const Couid = req.query.Couid
        const coupons = await coupon.findOne({ _id: Couid });
        coupons.isActive = !coupons.isActive
        await coupons.save()
        res.redirect('/admin/coupon')
    } catch (error) {
        console.log(error.message)
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.body.id; 
        
        const deletedCoupon = await coupon.findOneAndDelete({ _id: couponId });
    

        if (deletedCoupon) {
            return res.json({ success: true, message: "Coupon deleted successfully" });
        } else {
            return res.json({ success: false, message: "Coupon not found" });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};




const applyCoupon = async (req, res) => {
    try {
        const { couponCode, selectedAmount } = req.body;
        const userId = req.session.user_id;
        const foundCoupon = await coupon.findOne({ 
            couponCode: couponCode, 
            isActive: true, 
            expirationDate: { $gte: Date.now() } 
        });

        if (!foundCoupon) {
            return res.json({
                success: false,
                message: 'Coupon not found or expired.'
            });
        }

        const userRedeemed = foundCoupon.redeemedUsers.find(user => user.userId === userId);
        if (userRedeemed) {
            return res.json({
                success: false,
                message: 'Coupon has already been redeemed by the user.'
            });
        }
        if (selectedAmount < foundCoupon.minimumPurchase) {
            return res.json({
                success: false,
                message: 'Selected coupon is not applicable for this price.'
            });
        }

        foundCoupon.redeemedUsers.push({ userId: userId, usedTime: new Date() });
        foundCoupon.timesUsed++;
        await foundCoupon.save();

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully.',
            couponName: foundCoupon.couponName,
            discountAmount: foundCoupon.discountAmount
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};


const removeCoupon = async(req,res)=>{
    try{
        const { couponCode } = req.body; 
        const userId = req.session.user; 
        console.log(userId, "userID")
        console.log(couponCode, "Coupon")
        
        const updatedCoupon = await coupon.findOneAndUpdate(
            { couponCode: couponCode },
            { $pull: { redeemedUsers: { userId: userId } } }, 
            { new: true } 
        );

        if (updatedCoupon) {
            console.log("Coupon updated successfully:", updatedCoupon);
           
        } else {
            console.log("Coupon not found or user not redeemed it:", couponCode);  
        }
    } catch(error){
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
};

const selectCoupon = async (req, res) => {
    try {
        const currentDate = new Date();
        const userId = req.session.user_id;
        const grandTotal = req.body.grandTotal;

        const userData = await User.findOne({ _id: userId });
        const addressData = await Address.find({ userId: userId });
        const cartData = await cart.findOne({ userId: userId }).populate('product.productId');
        const cartLength = cartData ? cartData.product.length : 0;


        const availableCoupons = await coupon.find({
            isActive: true,
            expirationDate: { $gte: currentDate }
        });

        const validCoupons = availableCoupons.filter(coupon => {
            const isMinPurchaseValid = grandTotal >= coupon.minimumPurchase;
            const isUserEligible = !coupon.redeemedUsers.some(user => user.userId === String(userId));
            return isMinPurchaseValid && isUserEligible;
        });
        if (validCoupons.length > 0) {
            res.render('users/checkout', { 
            name: userData.name,
            addresses: addressData || [], 
            cartData, 
            cartLength, 
           availableCoupons: validCoupons, grandTotal });
        } else {
            res.render('users/checkout', { 
                name: userData.name,
                addresses: addressData || [], 
                cartData, 
                cartLength, 
                availableCoupons: [], grandTotal });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




module.exports= {
    getCart,
    addToCart,
    updateCart,
    removeFromCart,
    isCartempty,
    loadCheckout,
    placeOrder,
    addCoupon,
    blockCoupon,
    deleteCoupon,
    applyCoupon,
    removeCoupon,
    selectCoupon,
    onlinepay,
    saveOrder



}