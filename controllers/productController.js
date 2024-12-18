const Product=require("../models/productModel") 
const category = require("../models/categoryModel");
const Orders = require('../models/orderModel');
const { v4: uuidv4 } = require("uuid")
const sharp = require('sharp')
const fs = require('fs');
const path = require('path')
const mongoose = require('mongoose');
const {upload} = require('../multer/multer');
const rimraf = require('rimraf');



const productListview = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;  
    const limit = 4
    const skip = (page - 1) * limit; 

  
    const products = await Product.find()
      .skip(skip)
      .limit(limit);
    const totalProducts = await Product.countDocuments();
   const  totalPages = Math.ceil(totalProducts / limit)

    res.render('admin/productlist', {
      products,
      currentPage: page,
      totalPages: totalPages,
      limit:limit
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).send('Server Error');
  }
};

  const loadaddProduct = async(req,res)=>{
  
    try{
       const categories = await category.find()
      res.render("admin/addProduct",{categories })
    }
    catch(error){
      console.error(error)
      res.status(500).send('Internal server error ')
    }
  }


  function deleteFileWithRetries(filePath, retries = 3, delay = 2000) {  // Increased delay to 2 seconds
    return new Promise((resolve, reject) => {
      const attemptDelete = (attemptsLeft) => {
        fs.unlink(filePath, (err) => {
          if (err && attemptsLeft > 0) {
            console.log(`Failed to delete ${filePath}. Retrying...`);
            setTimeout(() => attemptDelete(attemptsLeft - 1), delay);  // Retry with longer delay
          } else if (err) {
            console.error(`Error deleting file: ${filePath}.`, err);
            reject(err);
          } else {
            console.log(`Successfully deleted file: ${filePath}`);
            resolve();
          }
        });
      };
      attemptDelete(retries);
    });
  }
  
  // const productInsert = async (req, res) => {
  //   const { productName, productDescription, productPrice, countStock, listed, productBrand, productCategory } = req.body;
  //   const croppedImages = req.files;  
  //   let imageUrls = [];
  
  //   try {
  //     console.log("Received Product Data:", req.body);
  //     console.log("Uploaded Files:", croppedImages);
  
  //     for (const file of croppedImages) {
  //       const filename = `${uuidv4()}.jpg`; 
  //       const outputPath = path.join(__dirname, '../public/uploads', filename); 
      
  //       try {
        
  //         await sharp(file.path)
  //           .resize({ width: 386, height: 595 }) 
  //           .toFile(outputPath); 
  //         console.log(`Processed and saved image: ${outputPath}`);
      
  //         imageUrls.push(filename); 
      
        
  //         setTimeout(() => {
  //           try {
  //             fs.unlinkSync(file.path);
  //             console.log(`Deleted temporary file: ${file.path}`);
  //           } catch (error) {
  //             console.warn(`Failed to delete temporary file: ${file.path}`, error);
  //           }
  //         }, 2000); 
  //       } catch (error) {
  //         console.error("Error processing image:", error);
  //         return res.status(500).send("Error processing image.");
  //       }
  //     }
      
  //     console.log("Saving product with images:", imageUrls);
  
    
  //     res.status(200).send("Product created successfully!");
  
  //   } catch (error) {
  //     console.error("Error in product insertion:", error);
  //     res.status(500).send("Internal server error.");
  //   }
  // };

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
  



  const ToggleblockProduct = async (req,res)=>{
    try{
      const productid= req.query.proid
      
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
    
       
        const product = await Product.findOne({
          _id: req.query.id,
          is_Active: true
        }).populate('productCategory');
    
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
  
          let imageUrls = existingProduct.images || [];
          console.log("Existing images before adding new ones:", imageUrls);


          const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
          // Process new files if they are provided
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

                      console.log("Added image:", filename);
                      console.log("Updated image list:", imageUrls);
                      try {
                        fs.unlinkSync(file.path);
                        console.log(`Deleted temporary file: ${file.path}`);
                      } catch (error) {
                        console.warn(`Failed to delete temporary file: ${file.path}`, error);
                      
                      }
                      
                  } catch (sharpError) {
                      console.error("Sharp Error:", sharpError);
                      errors.push("Error processing image.");
                      break;
                  }
              }
  
              if (errors.length > 0) {
                  return res.status(400).json({ errors });
              }
  
              // Ensure the total images do not exceed 4
              if (imageUrls.length > 4) {
                  imageUrls = imageUrls.slice(0, 4); 
              }
          }
  
          console.log("Final images list to be saved:", imageUrls);
        
          const updateData = {
              productName: productName || existingProduct.productName,
              productDescription: productDescription || existingProduct.productDescription,
              productCategory: productCategory || existingProduct.productCategory,
              productBrand: productBrand || existingProduct.productBrand,
              productPrice: productPrice ? parseFloat(productPrice) : existingProduct.productPrice,
              countStock: countStock ? parseInt(countStock) : existingProduct.countStock,
              listed: listed !== undefined ? listed === 'true' : existingProduct.listed,
              images: imageUrls 
          };
  
          const editedProduct = await Product.findByIdAndUpdate(
              productId,
              { $set: updateData },
              { new: true }
          );
  
          if (!editedProduct) {
              console.error('Error: Product not edited');
              return res.status(500).json({ success: false, error: 'Product not edited' });
          }
  
          res.redirect("/admin/productlist");
      } catch (error) {
          console.error('Error in editProduct:', error);
          res.status(500).json({ success: false, error: 'Server error' });
      }
  };


const deleteImage= async(req,res)=>{
  try {
const{image,productId} = req.body;

const product = await Product.findByIdAndUpdate(
  productId,
  { $pull: { image: image } },
  { new: true }
);

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