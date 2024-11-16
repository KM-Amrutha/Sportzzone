
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

const addCoupon = async (req, res) => {
    if (!req.session.admin_id) {
        req.flash('error', 'Unauthorized. Please log in first.');
        return res.redirect('/admin/login');  // Redirect to login page
    }

    let couponData = [];
    try {
        console.log('coupon ethii makallleee')
        const page = parseInt(req.query.page || 1);
        const limit = 4;
        const skip = (page - 1) * limit;
        couponData = await coupon.find().sort({ Date: -1 }).skip(skip).limit(limit);
        const totalCoupons = await coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit); 

        const { couponName, couponCode, minimumPurchase, discountAmount, expirationDate } = req.body;

        if (!couponName || !couponCode || !minimumPurchase || !discountAmount || !expirationDate) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/admin/coupon?page=' + page);  // Redirect back to coupon page
        }

        // Check for valid coupon name format
        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(couponName)) {
            req.flash('error', 'Coupon name should only contain alphabets and spaces.');
            return res.redirect('/admin/coupon?page=' + page);
        }

        // Check if coupon code length is valid
        if (couponCode.length < 3 || couponCode.length > 20) {
            req.flash('error', 'Coupon code must be between 3 and 20 characters long.');
            return res.redirect('/admin/coupon?page=' + page);
        }

        // Check expiration date validity
        const today = new Date();
        const expiryDate = new Date(expirationDate);
        if (isNaN(expiryDate.getTime()) || expiryDate <= today) {
            req.flash('error', 'Expiration date must be a future date.');
            return res.redirect('/admin/coupon?page=' + page);
        }

        // Check if coupon already exists
        const existingCoupon = await coupon.findOne({ $or: [{ couponCode }, { couponName }] });
        if (existingCoupon) {
            let errorMessage = '';
            if (existingCoupon.couponCode === couponCode) {
                errorMessage = 'Coupon code already exists.';
            } else if (existingCoupon.couponName === couponName) {
                errorMessage = 'Coupon name already exists.';
            }
            req.flash('error', errorMessage);
            return res.redirect('/admin/coupon?page=' + page);
        }

        // Validate minimum purchase and discount amounts
        const minPurchaseValue = parseFloat(minimumPurchase);
        const discountValue = parseFloat(discountAmount);

        if (isNaN(minPurchaseValue) || minPurchaseValue < 100) {
            req.flash('error', 'Minimum purchase amount must be at least Rs. 100.');
            return res.redirect('/admin/coupon?page=' + page);
        }
        if (isNaN(discountValue) || discountValue <= 0 || discountValue >= minPurchaseValue) {
            req.flash('error', 'Discount amount must be a positive number and less than the minimum purchase amount.');
            return res.redirect('/admin/coupon?page=' + page);
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

    

        // Render the coupon page with the new data
        return res.render('admin/coupon', {
            couponData,
            error: null,
            currentPage: page,
            totalPages,
            limit,
            messages: req.flash()  // Pass flash messages to the view
        });
    } catch (error) {
        console.error('Error adding coupon:', error);
        req.flash('error', 'Internal server error');
        return res.redirect('/admin/coupon?page=1');
    }
};


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { couponCode, paymentMethod } = req.body;

        const userCart = await cart.findOne({ userId });
        const address = await Address.find({ userId });
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
        let couponDiscount = 0;

        if (appliedCoupon) {
            couponDiscount = appliedCoupon.discountAmount;
        }

        let productDataToSave;
        if (req.session.buyNowProductId) {
            const buyNowProduct = await products.findById(req.session.buyNowProductId);
            if (!buyNowProduct) {
                return res.status(400).json({ message: "Product not found." });
            }
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
        } else {
            productDataToSave = await Promise.all(userCart.product.map(async (item) => {
                const product = await products.findById(item.productId);
                if (!product) {
                    return res.status(400).json({ message: `Product not found: ${item.productId}` });
                }
                const offerPrice = product.offer ? product.offer.price : product.productPrice;
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.productPrice,
                    offerPrice: offerPrice
                };
            }));
        }
        let paymentStatus = "Pending";
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
        if (paymentMethod === "Razorpay") {
            const razorpayOrder = await instance.orders.create({
                amount: req.body.amount,
                currency: "INR",
                receipt: newOrderId,
            });
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

        await order.save();
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
            await cart.deleteOne({ userId });
        }
        if (!order || !order.orderId) {
            return res.status(500).json({ message: "Failed to create order." });
        }
        res.status(200).json({ 
            message: "Order Placed Successfully", 
             order 
        });
    } catch (error) {
        console.error("Error in placeOrder:", error.message);
        res.status(500).json({ message: "Something went wrong!" });
    }
};



