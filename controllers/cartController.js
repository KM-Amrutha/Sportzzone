const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const cart = require('../models/cartModel');


// const getCart = async(req,res)=>{
//     try{
//         const userId = req.session.user_id
//         const userData = await User.findOne({ _id: userId });
//         if (!userData) {
//             return res.status(404).send("User not found");
//         }
        
        
//         const cartData = await cart.findOne({ userId: userId }).populate('product.productId')
//         const cartLength = cartData ? cartData.product.length : 0

//         res.render("users/cart",{ cartData, name: userData.name, cartLength })
      


//     } catch(error){
//         console.error(error)
    
//     }
// }
// const getCart = async(req, res) => {
//     try {
//         const userId = req.session.user_id;
//         console.log('getCart - User ID:', userId);
//         const userData = await User.findOne({ _id: userId });

//         if (!userData) {
//             return res.status(404).send("User not found");
//         }

//         const cartData = await cart.findOne({ userId: userId }).populate('product.productId');

//         if (!cartData) {
//             return res.render("users/cart", { cartData: [], name: userData.name, cartLength: 0 });
//         }
//         const cartLength = cartData ? cartData.product.length : 0;
//         // const cartLength = cartData.product.length;
//         res.render("users/cart", { cartData, name: userData.name, cartLength });

//     } catch (error) {
//         console.error(error);
//     }
// }
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



const addToCart = async(req,res)=>{
    try{
        const productId = req.body.productId
        console.log('productid:', productId);
        
        const userId = req.session.user_id;

        const product = await products.findById(productId);
        if (!product || product.countStock === 0) {
            return res.status(404).json({ success: false, error: 'Product is out of stock' });
        }


        let Cart = await cart.findOne({ userId });
        if (!Cart) { 
            Cart = new cart({ userId, product: [] });
        }
        
        const existingProductIndex = Cart.product.findIndex(item => item.productId.toString() === productId);
        if (existingProductIndex !== -1) {
            const totalQuantity = Cart.product[existingProductIndex].quantity + 1;
            if (totalQuantity > product.countStock) {
                return res.status(400).json({ success: false, error: 'Cannot add more items than available stock' });
            }
            Cart.product[existingProductIndex].quantity = totalQuantity;
        } else {
            Cart.product.push({ productId, quantity: 1, price: product.productPrice });
        }

        await Cart.save();

        // Send a response indicating success along with the updated cart length
        const cartLength = Cart.product.reduce((total, item) => total + item.quantity, 0);
        res.status(200).json({ success: true, message: 'Product added to cart successfully', cartLength });

    } catch(error){
        console.error(error)
    }
}


// const updateCart = async(req, res) => {
//     try {
//         const { productId, direction } = req.body;
//         const userId = req.session.user_id;
       
//         console.log('updateCart - User ID:', userId); // Debugging log
//         console.log('updateCart - Product ID:', productId); // Debugging log
//         console.log('updateCart - Direction:', direction); // Debugging log
// // Debugging log

//         let userCart = await cart.findOne({ userId: userId }).populate('product.productId');
//         console.log('updateCart - User Cart:', userCart); // Debugging log

//         if (!userCart) {
//             return res.status(404).json({ error: 'User does not have a cart' });
//         }

//         const productIndex = userCart.product.findIndex(item => item.productId._id.toString() === productId);
//         if (productIndex !== -1) {
//             const product = userCart.product[productIndex].productId;

//             if (direction === 'up') {
//                 if (userCart.product[productIndex].quantity < product.countStock) {
//                     userCart.product[productIndex].quantity++;
//                 } else {
//                     return res.json({ error: 'Item is out of stock' });
//                 }
//             } else if (direction === 'down' && userCart.product[productIndex].quantity > 1) {
//                 userCart.product[productIndex].quantity--;
//             }

//             userCart.totalPrice = userCart.product.reduce((total, item) => {
//                 if (item && item.productId) {
//                     return total + (item.quantity * item.productId.productPrice);
//                 }
//                 return total;
//             }, 0);

//             await userCart.save();

//             console.log('updateCart - Updated Cart:', userCart.product[productIndex]); // Debugging log

//             res.json({
//                 quantity: userCart.product[productIndex].quantity,
//                 totalPrice: userCart.totalPrice,
//             });
//         } else {
//             console.log('Item not found in the cart.');
//             return res.status(404).json({ error: 'Item not found in the cart' });
//         }
//     } catch (error) {
//         console.error('updateCart - Error:', error.message);
//     }
// }
const updateCart = async (req, res) => {
    try {
        const { productId, direction } = req.body;
        const currentUserId = req.session.user_id;
    
        let userCart = await cart.findOne({ userId: currentUserId });
        
        if (!userCart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        const cartItemIndex = userCart.product.findIndex(item => item.productId.toString() === productId);

        if (cartItemIndex !== -1) {
            // Get the product details (assuming `Product` is your product model)
            const currentProduct = await products.findById(productId);

            if (!currentProduct) {
                return res.status(404).json({ error: 'Product not found' });
            }

            if (direction === 'up') {
                // Increase quantity if stock allows
                if (userCart.product[cartItemIndex].quantity < currentProduct.countStock) {
                    userCart.product[cartItemIndex].quantity++;
                } else {
                    return res.json({ error: 'Item is out of stock' });
                }
            } else if (direction === 'down') {
                // Decrease quantity if it's more than 1
                if (userCart.product[cartItemIndex].quantity > 1) {
                    userCart.product[cartItemIndex].quantity--;
                }
            }

            // Save the updated cart
            await userCart.save();

            // Recalculate total price or any other cart data if needed

            return res.json({ 
                success: true, 
                cart: userCart,
                message: 'Cart updated successfully'
            });
        } else {
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

























module.exports= {
    getCart,
    addToCart,
    updateCart,
    removeFromCart
}