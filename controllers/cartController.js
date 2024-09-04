const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Orders = require('../models/orderModel');
const cart = require('../models/cartModel');



const getCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const userData = await User.findOne({ _id: userId });

        if (!userData) {
            return res.status(404).send("User not found");
        }

        const cartData = await cart.findOne({ userId: userId }).populate('product.productId');
        console.log("cart data ",cartData)

        if (!cartData) {
            return res.render("users/cart", { cartData: [], name: userData.name, cartLength: 0 });
        }

        const cartLength = cartData.product.length;
        res.render("users/cart", { cartData, name: userData.name, cartLength });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};



const addToCart = async (req, res) => {
    try {

        const productId = req.body.productId;
        const userId = req.session.user_id;

        const product = await products.findById(productId);
        if (!product || product.countStock === 0) {
            return res.status(404).json({ success: false, message: 'Product is out of stock' });
        }

        let Cart = await cart.findOne({ userId });
        if (!Cart) {
            Cart = new cart({ userId, product: [] });
        }

        const existingProductIndex = Cart.product.findIndex(item => item.productId.toString() === productId);
        if (existingProductIndex !== -1) {
            const totalQuantity = Cart.product[existingProductIndex].quantity + 1;

            if (totalQuantity > 6) {
                return res.status(400).json({ success: false, message: 'You can only add up to 5 of the same product to your cart.' });
            }

            if (totalQuantity > product.countStock) {
                return res.status(400).json({ success: false, message: 'Cannot add more items than available stock' });
            }

            Cart.product[existingProductIndex].quantity = totalQuantity;
        } else {
            Cart.product.push({ productId, quantity: 1, price: product.productPrice });
        }

        await Cart.save();

        console.log('Product added to cart successfully'); // Debugging line

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

        if (!userCart) {
            console.log('Cart not found');
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartItemIndex = userCart.product.findIndex(item => item.productId.toString() === productId);

        if (cartItemIndex !== -1) {
            const currentProduct = await products.findById(productId);

            if (!currentProduct) {
                console.log('Product not found');
                return res.status(404).json({ error: 'Product not found' });
            }

            const maxQuantityPerPerson = 5;

            if (direction === 'up') {
                if (userCart.product[cartItemIndex].quantity < maxQuantityPerPerson &&
                    userCart.product[cartItemIndex].quantity < currentProduct.countStock) {
                    userCart.product[cartItemIndex].quantity++;
                } else if (userCart.product[cartItemIndex].quantity >= maxQuantityPerPerson) {
                    return res.json({ error: 'Cannot add more than the maximum allowed quantity of 5 per person.' });
                } else {
                    return res.json({ error: 'Item is out of stock' });
                }
            } else if (direction === 'down') {
                if (userCart.product[cartItemIndex].quantity > 1) {
                    userCart.product[cartItemIndex].quantity--;
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
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
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

const loadCheckout =async(req,res)=>{
    
    
    try{
        let userId = req.session.user_id;
        const Cart = await cart.findOne({ userId });
        const userData = await User.findOne({ _id: userId });
        const addressData = await Address.find({ userId: userId });
        const cartData = await cart.findOne({ userId: userId }).populate('product.productId')
        const cartLength = cartData ? cartData.product.length : 0
       
    
        res.render('users/checkout', { name: userData.name, cartData, addresses: addressData, cartLength })

    } catch(error){
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });

    }
}

const placeOrder = async (req, res) => {
    try {
        console.log("inside placeorder=++++++++++++++++++++", req.body);
        const userId = req.session.user_id;

        // Renaming to avoid conflict with the model name
        const userCart = await cart.findOne({ userId });
        const address = await Address.findOne({ _id: req.body.address });

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
        const orderItems = userCart.product;  // Use renamed variable

        let paymentStatus = "Pending"; // Default payment status
        let productDataToSave;

        if (req.session.buyNowProductId) {
            const buyNowProduct = await products.findById(req.session.buyNowProductId);  // Corrected model usage
            if (buyNowProduct) {
                productDataToSave = {
                    productId: buyNowProduct._id,
                    quantity: 1,
                    price: buyNowProduct.saleprice
                };

                // Decrease product quantity by 1
                if (buyNowProduct.stock > 0) {
                    buyNowProduct.stock -= 1;
                    await buyNowProduct.save();
                }

                delete req.session.buyNowProductId;
                await req.session.save();
            }
        } else {
            productDataToSave = userCart.product;  // Use renamed variable
        }

        console.log("Product data ::", productDataToSave);

        const order = new Orders({
            orderId: newOrderId,
            userId,
            paymentMethod: req.body.paymentMethod,
            paymentStatus, // Set payment status
            totalAmount: req.body.amount,
            product: productDataToSave,
            address,
        });

        await order.save();

        // Update product stock for each item in the order
        for (const item of orderItems) {
            const orderProduct = await products.findById(item.productId);  // Corrected model usage
            if (orderProduct) {
                orderProduct.stock -= item.quantity; // Subtract order quantity from product stock
                await orderProduct.save();
            }
        }
        await cart.deleteOne({ userId });
        
        res.status(200).json({ message: "Order Placed Successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong!" });
    }
};



module.exports= {
    getCart,
    addToCart,
    updateCart,
    removeFromCart,
    isCartempty,
    loadCheckout,
    placeOrder

}