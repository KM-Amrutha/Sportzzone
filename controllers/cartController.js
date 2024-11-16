const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Orders = require('../models/orderModel');
const cart = require('../models/cartModel');
const coupon = require('../models/couponModel');
const Wishlist = require('../models/wishlistModel');
const flash = require('connect-flash')

const Wallet = require('../models/walletModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');

require('dotenv').config();

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;


let instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});



// const onlinepay = async (req, res) => {
//     try {
        
//         const userId = req.session.user_id;
        
//         let productDataToSave;
//         let addresses = await Address.findById(req.body.address);
//         const cartData = await cart.findOne({ userId });


//         if (!cartData || !cartData.product || cartData.product.length === 0) {
//             return res.status(400).json({ message: "Cart is empty or not found." });
//         }

//         function generateOrderId() {
//             const timestamp = Date.now().toString();
//             const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//             let orderId = 'ORD';
//             while (orderId.length < 6) {
//                 const randomIndex = Math.floor(Math.random() * randomChars.length);
//                 orderId += randomChars.charAt(randomIndex);
//             }
//             return orderId + timestamp.slice(-6);
//         }

//         const newOrderId = generateOrderId();
//             productDataToSave = cartData.product; 

        
//         let couponDiscount = 0;
//         const { couponCode } = req.body;
//         if (couponCode) {
//             const couponDetails = await coupon.findOne({ couponCode });
//             if (couponDetails) {
//                 couponDiscount = couponDetails.discountAmount;
//             }
//         }

        
//         const newOrder = new Orders({
//             orderId:newOrderId,
//             userId,
//             address: addresses,
//             paymentMethod: req.body.paymentMethod,
//             paymentStatus: 'Received',
//             totalAmount: req.body.amount,
//             couponDiscount,
//             product: productDataToSave
            
//         });

//         await newOrder.save();
//         const razorpayOrder = await instance.orders.create({
//             amount: req.body.amount *100,
//             currency: "INR",
//             receipt: newOrder._id.toString(),
//         });
        
//         res.json({ razorpayOrder, order: newOrder });

//     } catch (error) {
//         console.error(error.message);
//         res.status(500).send('Internal Server Error');
//     }
// };


const onlinepay = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const cartData = await cart.findOne({ userId });
        let addresses = await Address.findById(req.body.address);

        if (!cartData || !cartData.product || cartData.product.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found." });
        }

        const totalAmount = req.body.amount * 100;

        
        const razorpayOrder = await instance.orders.create({
            amount: totalAmount, 
            currency: "INR",
            receipt: `order_${new Date().getTime()}`, 
        });
       
        console.log('razarpay instance il order create aavuo nokkan',razorpayOrder);

        
        const order = new Orders({
            userId: userId,
            paymentStatus: "Pending",
            paymentMethod: "Razorpay",
            totalAmount: totalAmount / 100, 
            address: addresses,
            razorpayOrderId: razorpayOrder.id, 
        }); 
        
        await order.save();
        console.log(order.razorpayOrder);

        console.log('ith onlinepay yude razorpay order nokkan vendi',order);
        
        
        res.json({ razorpayOrder, orderId: order._id });

    } catch (error) {
        console.error('Error in onlinepay:', error.message);
        res.status(500).send('Internal Server Error');
    }
};



const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
    

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in to add products to your cart.' });
        }

        const productId = req.body.productId;
        const product = await products.findById(productId).populate('productCategory');
        if (!product || product.countStock === 0) {
            return res.status(404).json({ success: false, message: 'Product is out of stock' });
        }
        const categoryOfferActive = product.productCategory.OfferisActive;
        
        let Cart = await cart.findOne({ userId });
        if (!Cart) {
            Cart = new cart({ userId, product: [] });
        }

        const existingProductIndex = Cart.product.findIndex(item => item.productId.toString() === productId);

        const priceToSave = categoryOfferActive ? product.offerPrice : product.productPrice;

        if (existingProductIndex !== -1) {
            const totalQuantity = Cart.product[existingProductIndex].quantity + 1;

            if (totalQuantity > 5) {
                return res.status(400).json({ success: false, message: 'You can only add up to 5 of the same product to your cart.' });
            }

            if (totalQuantity > product.countStock) {
                return res.status(400).json({ success: false, message: 'Cannot add more items than available stock' });
            }

            Cart.product[existingProductIndex].quantity = totalQuantity;
            Cart.product[existingProductIndex].price = priceToSave; 
            
        } else {
            Cart.product.push({ productId, quantity: 1, price: priceToSave });
        
        }
        await Cart.save();

        const wishlist = await Wishlist.findOne({ userId });
        if (wishlist) {
            wishlist.product = wishlist.product.filter(item => item.productId.toString() !== productId);
            await wishlist.save();
        
        }

        res.status(200).json({ 
            "success": true,
            "message": "Product added to cart successfully!"
           });
    } catch (error) {
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

            const basePrice = categoryOfferActive ? currentProduct.offerPrice : currentProduct.productPrice;

        

            const maxQuantityPerPerson = 5;

            if (direction === 'up') {
                // Increase logic
                if (userCart.product[cartItemIndex].quantity < maxQuantityPerPerson &&
                    userCart.product[cartItemIndex].quantity < currentProduct.countStock) {
                    
                    userCart.product[cartItemIndex].quantity++;
                    userCart.product[cartItemIndex].price = basePrice * userCart.product[cartItemIndex].quantity;

                    
                } else if (userCart.product[cartItemIndex].quantity >= maxQuantityPerPerson) {
                    return res.json({ error: 'Cannot add more than the maximum allowed quantity' });
                } else {
                    return res.json({ error: 'Item is out of stock' });
                }
            } else if (direction === 'down') {
                
                if (userCart.product[cartItemIndex].quantity > 1) {
                    userCart.product[cartItemIndex].quantity--;
                    userCart.product[cartItemIndex].price = basePrice * userCart.product[cartItemIndex].quantity;

                }
            }

            await userCart.save();

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
        const userId=req.session.user_id;
const userData=await User.findById(userId);

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

        res.render("users/cart", { cartData,
             user: userData, 
             cartLength, 
             totalPrice });

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
};



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
        let couponDiscount = 0;
        let deliveryCharge = 50;

        if (cartData && cartData.product.length > 0) {
            cartData.product.forEach(item => {
                grandTotal += item.productId.offerPrice < item.productId.productPrice ?
                    item.productId.offerPrice * item.quantity : item.productId.productPrice * item.quantity;
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

        
        if (req.session.appliedCoupon) {
            const appliedCoupon = await coupon.findOne({ couponCode: req.session.appliedCoupon });
            if (appliedCoupon && grandTotal >= appliedCoupon.minimumPurchase) {
                couponDiscount = appliedCoupon.discountAmount;
                grandTotal -= couponDiscount;
            }
        }

        grandTotal += deliveryCharge; 

        res.render('users/checkout', { 
            user: userData, 
            cartData, 
            addresses: addressData,
            cartLength, 
            grandTotal, 
            couponDiscount, // Pass coupon discount
            deliveryCharge,  // Pass delivery charge
            availableCoupons: validCoupons 
        });

    } catch (error) {
        console.log('Error during checkout load:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.user_id;
//         const { couponCode, paymentMethod } = req.body;

//         const userCart = await cart.findOne({ userId });
//         const address = await Address.find({ userId });
//         if (!userCart || userCart.product.length === 0) {
//             return res.status(400).json({ message: "Cart is empty or not found." });
//         }

        
//         if (paymentMethod === "Razorpay") {
//             return res.status(200).json({ message: "Redirecting to Razorpay..." });
//         }

//         const appliedCoupon = await coupon.findOne({ couponCode, OfferisActive: true, expirationDate: { $gte: Date.now() } });

//         function generateOrderId() {
//             const timestamp = Date.now().toString();
//             const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//             let orderId = 'ORD';
//             while (orderId.length < 6) {
//                 const randomIndex = Math.floor(Math.random() * randomChars.length);
//                 orderId += randomChars.charAt(randomIndex);
//             }
//             return orderId + timestamp.slice(-6);
//         }

//         const newOrderId = generateOrderId();
//         let couponDiscount = 0;

//         if (appliedCoupon) {
//             couponDiscount = appliedCoupon.discountAmount;
//         }

//         const productDataToSave = await Promise.all(userCart.product.map(async (item) => {
//             const product = await products.findById(item.productId);
//             if (!product) {
//                 return res.status(400).json({ message: `Product not found: ${item.productId}` });
//             }
//             const offerPrice = product.offer ? product.offer.price : product.productPrice;
//             return {
//                 productId: item.productId,
//                 quantity: item.quantity,
//                 price: product.productPrice,
//                 offerPrice: offerPrice
//             };
//         }));

//         let paymentStatus = "Pending";
//         if (paymentMethod === "Wallet") {
//             const userWallet = await Wallet.findOne({ userId });
//             if (userWallet && userWallet.balance >= req.body.amount) {
//                 paymentStatus = "Received";
//                 userWallet.balance -= req.body.amount;
//                 userWallet.transactionHistory.push({ amount: req.body.amount, type: 'Debit', currency: 'INR' });
//                 await userWallet.save();
//             } else {
//                 return res.status(400).json({ message: "Insufficient wallet balance" });
//             }
//         }

//         const order = new Orders({
//             orderId: newOrderId,
//             userId,
//             paymentMethod,
//             paymentStatus,
//             totalAmount: req.body.amount,
//             product: productDataToSave,
//             address,
//             couponDiscount
//         });

//         await order.save();
//         for (const item of productDataToSave) {
//             const orderProduct = await products.findById(item.productId);
//             if (orderProduct) {
//                 if (orderProduct.countStock >= item.quantity) {
//                     orderProduct.countStock -= item.quantity;
//                     await orderProduct.save();
//                 } else {
//                     return res.status(400).json({ message: `Insufficient stock for product: ${orderProduct.productName}` });
//                 }
//             }
//         }
//         await cart.deleteOne({ userId });

//         if (!order || !order.orderId) {
//             return res.status(500).json({ message: "Failed to create order." });
//         }
//         res.status(200).json({ 
//             message: "Order Placed Successfully", 
//             order 
//         });
//     } catch (error) {
//         console.error("Error in placeOrder:", error.message);
//         res.status(500).json({ message: "Something went wrong!" });
//     }
// };

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { couponCode, paymentMethod } = req.body;

        const userCart = await cart.findOne({ userId });
        const address = await Address.find({ userId });
        
        if (!userCart || userCart.product.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found." });
        }

        
        if (req.body.amount > 1000 && paymentMethod === "Cash on delivery") {
            return res.status(400).json({
                message: "Cash on Delivery is not available for orders over Rs. 1000."
            });
        }


        const appliedCoupon = await coupon.findOne({
            couponCode, 
            OfferisActive: true, 
            expirationDate: { $gte: Date.now() }
        });

        let couponDiscount = 0;
        if (appliedCoupon) {
            couponDiscount = appliedCoupon.discountAmount;
        }

        
        const productDataToSave = [];

for (const item of userCart.product) {
    const product = await products.findById(item.productId);

    if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
    }

    const offerPrice = product.offer ? product.offer.price : product.productPrice;

    productDataToSave.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.productPrice,
        offerPrice: offerPrice
    });
}


        let paymentStatus = "Pending";
        let order;

        // Handle payment logic
        if (paymentMethod === "Cash on delivery" || paymentMethod === "Wallet") {
            if (paymentMethod === "Wallet") {
                const userWallet = await Wallet.findOne({ userId });
                if (userWallet && userWallet.balance >= req.body.amount) {
                    paymentStatus = "Received";
                    userWallet.balance -= req.body.amount;
                    userWallet.transactionHistory.push({ amount: req.body.amount, type: 'Debit', currency: 'INR' });
                    await userWallet.save();
                } else {
                    return res.status(400).json({ message: "Insufficient wallet balance" });
                }

            }

            // Generate unique order ID
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

            // Create the order
            order = new Orders({
                orderId: newOrderId,
                userId,
                paymentMethod,
                paymentStatus,
                totalAmount: req.body.amount,
                product: productDataToSave,
                address,
                couponDiscount
            });

            await order.save();

            // Reduce product stock after order creation
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

        
            await cart.deleteOne({ userId });

            if (appliedCoupon) {
                const userRedeemed = appliedCoupon.redeemedUsers.find(user => user.userId === userId);
                if (!userRedeemed) {
                    appliedCoupon.redeemedUsers.push({ userId: userId, usedTime: new Date() });
                    appliedCoupon.timesUsed++;
                    await appliedCoupon.save();
                }
            }
        }

        // Send success response
        res.status(200).json({
            message: paymentMethod === "Razorpay" ? "Proceed to Razorpay payment" : "Order Placed Successfully",
            order: order || null 
        });
    } catch (error) {
        console.error("Error in placeOrder:", error.message);
        res.status(500).json({ message: "Something went wrong!" });
    }
};





const addCoupon = async (req, res) => {
    if (!req.session.admin_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
    }

    try {

        const { couponName, couponCode, minimumPurchase, discountAmount, expirationDate } = req.body;

        if (!couponName || !couponCode || !minimumPurchase || !discountAmount || !expirationDate) {
            return res.json({ error: 'All fields are required.' });
        }

        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(couponName)) {
            return res.json({ error: 'Coupon name should only contain alphabets and spaces.' });
        }

        if (couponCode.length < 3 || couponCode.length > 20) {
            return res.json({ error: 'Coupon code must be between 3 and 20 characters long.' });
        }

        const today = new Date();
        const expiryDate = new Date(expirationDate);
        if (isNaN(expiryDate.getTime()) || expiryDate <= today) {
            return res.json({ error: 'Expiration date must be a future date.' });
        }

        const existingCoupon = await coupon.findOne({ $or: [{ couponCode }, { couponName }] });
        if (existingCoupon) {
            let errorMessage = existingCoupon.couponCode === couponCode 
                ? 'Coupon code already exists.' 
                : 'Coupon name already exists.';
            return res.json({ error: errorMessage });
        }

        const minPurchaseValue = parseFloat(minimumPurchase);
        const discountValue = parseFloat(discountAmount);

        if (isNaN(minPurchaseValue) || minPurchaseValue < 100) {
            return res.json({ error: 'Minimum purchase amount must be at least Rs. 100.' });
        }

        if (isNaN(discountValue) || discountValue <= 0 || discountValue >= minPurchaseValue) {
            return res.json({ error: 'Discount amount must be a positive number and less than the minimum purchase amount.' });
        }

        // Save the new coupon
        const newCoupon = new coupon({
            couponName,
            couponCode,
            minimumPurchase: minPurchaseValue,
            discountAmount: discountValue,
            expirationDate,
            is_Active: true
        });
        await newCoupon.save();

        return res.json({ success: true, message: 'Coupon added successfully!' });
    } catch (error) {
        console.error('Error adding coupon:', error);
        return res.status(500).json({ error: 'Internal server error' });
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

        // Check if a coupon has already been applied in the session
        if (req.session.appliedCoupon) {
            return res.status(400).json({
                success: false,
                message: 'A coupon has already been applied. Please remove it before applying another one.'
            });
        }

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

        if (selectedAmount < foundCoupon.minimumPurchase) {
            return res.json({
                success: false,
                message: 'Selected coupon is not applicable for this price.'
            });
        }
        req.session.appliedCoupon = couponCode;

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


const removeCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user_id;

        const updatedCoupon = await coupon.findOneAndUpdate(
            { couponCode: couponCode },
            { $pull: { redeemedUsers: { userId: userId } } },
            { new: true }
        );

        if (updatedCoupon) {
            console.log("Coupon updated successfully:", updatedCoupon);
            // Remove the applied coupon from the session
            delete req.session.appliedCoupon;
        } else {
            console.log("Coupon not found or user not redeemed it:", couponCode);
        }

        res.status(200).json({ message: "Coupon removed successfully." });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
};


const selectCoupon = async (req, res) => {
    try {
    

        const userId = req.session.user_id;
        const userData = await User.findOne({ _id: userId });
        const addressData = await Address.find({ userId: userId });
        const cartData = await cart.findOne({ userId: userId }).populate('product.productId');
        const cartLength = cartData ? cartData.product.length : 0;

        // Recalculate grandTotal from the cart data
        let grandTotal = 0;
        if (cartData && cartData.product.length > 0) {
            cartData.product.forEach(item => {
                grandTotal += item.productId.offerPrice < item.productId.productPrice ?
                item.productId.offerPrice * item.quantity : item.productId.productPrice * item.quantity;
            });
        }
        const currentDate = new Date();
        const availableCoupons = await coupon.find({
            isActive: true,
            expirationDate: { $gte: currentDate }
        });
        const validCoupons = availableCoupons.filter(coupon => {
            const isMinPurchaseValid = grandTotal >= coupon.minimumPurchase;
            // const isUserEligible = !coupon.redeemedUsers.some(user => user.userId === String(userId));
            return isMinPurchaseValid
        });
        res.render('users/checkout', {
            name: userData.name,
            addresses: addressData || [],
            cartData,
            cartLength,
            availableCoupons: validCoupons,
            
            grandTotal
        });

    } catch (error) {
        console.error('Error during coupon selection:', error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




const addtowallet = async (req, res) => {
    try {
        let amount = req.body.amount ; 
        const userId = req.session.user_id;
        // Create Razorpay order
        const order = await instance.orders.create({
            amount: amount*100, 
            currency: "INR",    
            receipt: req.session.user_id
        });

        // Update wallet balance
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: parseFloat(amount) });
        } else {
            wallet.balance += parseFloat(amount) ;

        
            wallet.transactionHistory.push({
                amount: parseFloat(amount) ,
                type: 'Credit',
                currency:'INR',

                createdAt: new Date()
            });
        }

        await wallet.save();

        console.log(amount, "amount added to wallet - from cart controller");
        res.json({ order });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const clearCart = async(req,res)=>{
    try{
        const userId = req.session.user_id;
        const cartData = await cart.findOne({userId});
        cartData.product = [];
        await cartData.save();
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'An error occurred while clearing the cart' });
    }
};



const verifyPayment = async (req, res) => {
    try {
        const { orderId, amount } = req.body;

        
        const order = await Orders.findOne({ orderId }); 
        console.log('ith verifyPayment inte razorpayorderId anu, matte orderid aaiytu match ano nokku', order)
        
        if (!order) {
            console.log('ordder kityilla')
            return res.status(404).json({ message: 'Order not found' });
        }

    
        order.paymentStatus = 'Received';
        order.paymentMethod = 'Razorpay';
        order.totalAmount = amount; 

        await order.save();

        
        res.status(200).json({
            message: 'Payment verified and order updated successfully',
            order
        });

    } catch (error) {
        console.error('Error in verifyPayment:', error.message);
        res.status(500).json({ message: 'Something went wrong while verifying the payment' });
    }
};






module.exports= {
    getCart,
    addToCart,
    updateCart,
    removeFromCart,
    isCartempty,

    clearCart,
    loadCheckout,
    placeOrder,
    addCoupon,
    blockCoupon,
    deleteCoupon,
    applyCoupon,
    removeCoupon,
    selectCoupon,
    onlinepay,
    addtowallet,
    verifyPayment



}