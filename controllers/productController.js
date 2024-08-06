const Product=require("../models/productModel") 
const category = require("../models/categoryModel");
const { v4: uuidv4 } = require("uuid")
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose');


const productListview = async (req,res) =>{
    try{
      const products = await Product.find()
      res.render('admin/productlist',{products})
  
    }catch(error){
      console.log(error.message);
    }
  };

  const loadaddProduct = async(req,res)=>{
    console.log("load Add product success");
    try{
       const categories = await category.find()
      res.render("admin/addProduct",{categories })
    }
    catch(error){
      console.error(error)
      res.status(500).send('Internal server error ')
    }
  }





    const productInsert = async (req, res) => {
      try {
          
          const {
              productName,
              productDescription,
              productCategory,
              productBrand,
              productPrice,
              countStock,
              listed
          } = req.body;

          const imageUrls= [];
          for (const file of req.files) {
            const filename = `${uuidv4()}.jpg`;
                const outputPath = path.join(__dirname, '../public/uploads', filename);
                try{
                await sharp(file.path)
                    .resize({ width: 386, height: 595 })
                    .toFile(outputPath);

                imageUrls.push(filename);

                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error(`Error deleting file: ${err}`);
                    } else {
                        console.log(`File deleted: ${file.path}`);
                    }
                });
            } catch (sharpError) {
                console.error("Sharp Error:", sharpError);
                throw new Error("Invalid input: Sharp failed to process the image.");
            }
        }
  
        
          if (!productName || !productDescription || !productCategory || !productBrand || !productPrice || !countStock) {
              return res.status(400).send({message:"All fields are required."});
          }
          const newProduct = new Product({
              productName: productName,
              productDescription: productDescription,
              productCategory: productCategory,
              productBrand: productBrand,
              productPrice: parseFloat(productPrice),  
              countStock: parseInt(countStock), 
              listed: listed || false,
              images: imageUrls
          });
          const productData = await newProduct.save();
  
          if (productData) {
              res.redirect('/admin/productlist');
          } else {
              console.log("Error saving product");
              res.status(500).send("Error saving product.");
          }
      } catch (error) {
          console.error("Error:", error.message);
          res.status(500).send("Internal server error");
      }
  };



  
  const ToggleblockProduct= async (req,res)=>{
    try{
  
  
      console.log("sanam kityyyyyyyyyyyyyyyyyyyyy")
      const productid= req.query.proid
      console.log(productid);
      const products = await Product.findOne({_id:productid}); 

      if (!products) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }
      products.is_Active =!products.is_Active
      await products.save()

      res.redirect("/admin/productlist")
    } catch(error){
      console.error('Error in ToggleblockProduct:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  };


    const loadeditProduct = async (req, res) => {
      try {
        const categories = await category.find({ is_Active: true });
    
        const product = await Product.findById(req.query.id).populate('productCategory');
    
        req.session.productid = req.query.id;
        if(product){
        res.render('admin/editProduct', {product,categories });
      }else{
        res.send('invalid')
      }

      } catch (error) {
        console.error(error.message);
      }
    };
    
    const editProduct = async (req, res) => {
      
      try {
          const errors = [];
          console.log('Request Body:', req.body);
          console.log('Request Files:', req.files);
  
          const {
              productName,
              productDescription,
              productCategory,
              productBrand,
              productPrice,
              countStock,
              listed
          } = req.body;
  
          const productId = req.query.id;
          // console.log('Product ID:', productId);
  
          if (!mongoose.Types.ObjectId.isValid(productId)) {
              return res.status(400).send({ error: 'Invalid product ID' });
          }
  
          const existingProduct = await Product.findById(productId);
          if (!existingProduct) {
              return res.status(404).send({ error: 'Product not found' });
          }
  
          const duplicateProduct = await Product.findOne({
              _id: { $ne: productId },
              productName: { $regex: new RegExp('^' + productName + '$', 'i') }
          });
  
          if (duplicateProduct) {
              return res.json({ success: false, error: 'Product name must be unique' });
          }
  
          const imageUrls = [];
          const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
          if (req.files && req.files.length > 0) {
              for (const file of req.files) {
                  if (!allowedImageTypes.includes(file.mimetype)) {
                      errors.push('One or more files have invalid type. Allowed types are: ' + allowedImageTypes.join(', '));
                      break;
                  }
  
                  const filename = `${uuidv4()}.jpg`;
                  const imageOutput = path.join(__dirname, '../public/uploads', filename);
  
                  try {
                      await sharp(file.path)
                          .resize({ width: 386, height: 595 })
                          .toFile(imageOutput);
  
                      imageUrls.push(filename);
  
                      fs.unlink(file.path, (err) => {
                          if (err) {
                              console.error(`Error deleting file: ${err}`);
                          } else {
                              console.log(`File deleted: ${file.path}`);
                          }
                      });
                  } catch (sharpError) {
                      console.error("Sharp Error:", sharpError);
                      errors.push("Error processing image.");
                      break;
                  }
              }
  
              if (errors.length > 0) {
                  return res.status(400).json({ errors });
              }
  
              if (imageUrls.length < 1) { // Update the count based on your requirements
                  errors.push('Please provide at least 1 image.');
                  return res.status(400).json({ errors });
              }
          }
  
          const updateData = {
              productName,
              productDescription,
              productCategory,
              productBrand,
              productPrice: parseFloat(productPrice),
              countStock: parseInt(countStock),
              listed: listed || false,
          };
  
          if (imageUrls.length > 0) {
              updateData.images = imageUrls;
          }
  
          console.log("Update Data:", updateData);
  
          const editedProduct = await Product.findByIdAndUpdate(
              productId,
              { $set: updateData },
              { new: true }
          );
  
          if (!editedProduct) {
              console.error('Error: Product not edited');
              return res.status(500).json({ success: false, error: 'Product not edited' });
          }
  
          console.log('Product edited successfully:', editedProduct);
  
          res.redirect("/admin/productlist");
      } catch (error) {
          console.error('Error in editProduct:', error);
          res.status(500).json({ success: false, error: 'Server error' });
      }
  };
  
    
const deleteImage= async(req,res)=>{
  try {
const{image,productId} = req.body;
console.log('IMAGE URL:',image)
console.log('PRODUCT:', productId);

const product = await Product.findByIdAndUpdate(
  productId,
  { $pull: { image: image } },
  { new: true }
);
console.log("Updated product:", product);
if (!product) {
    return res.status(404).json({ error: 'Product not found' });
}

return res.status(200).json({ message: 'Image deleted successfully', product })

  }catch(error){
    console.error('Error deleting image:', error);
        return res.status(500).json({ error: 'Internal server error' });
  }
}




  module.exports= {
    productListview,
    loadaddProduct,
    productInsert,
    loadeditProduct,
    editProduct,
    ToggleblockProduct,
    deleteImage
    


  }