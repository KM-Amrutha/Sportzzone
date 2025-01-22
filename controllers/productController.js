const Product=require("../models/productModel") 
const category = require("../models/categoryModel");
const Orders = require('../models/orderModel');
const { v4: uuidv4 } = require("uuid")
const sharp = require('sharp')
// const fs = require('fs');
const fs = require('fs').promises;
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

  function deleteFileWithRetry(filePath, retries = 3, delay = 1000) {
    const attemptDelete = (retryCount) => {
        fs.rm(filePath, { force: true }, (err) => {
            if (err) {
                if (err.code === 'EPERM' && retryCount > 0) {
                    console.log(`Retrying file deletion: ${filePath}`);
                    setTimeout(() => attemptDelete(retryCount - 1), delay);
                } else {
                    console.error(`Failed to delete file after retries: ${filePath}`, err);
                }
            } else {
                console.log(`File deleted successfully: ${filePath}`);
            }
        });
    };

    attemptDelete(retries);
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

//   const productInsert = async (req, res) => {
//     try {
        
//         const {
//             productName,
//             productDescription,
//             productCategory,
//             productBrand,
//             productPrice,
//             countStock,
//             listed
//         } = req.body;

     
//       console.log("req.body:", req.body);
//       console.log("req.files:", req.files);

//       if (!productName || !productDescription || !productCategory || !productBrand || !productPrice || !countStock) {
//         return res.status(400).send({message:"All fields are required."});
//     }

//         const imageUrls= [];

//          {
//               try{
//                 const filename = `${uuidv4()}.jpg`;
//               const outputPath = path.join(__dirname, '../public/uploads', filename);

//               await sharp(file.path)
//                   .resize({ width: 386, height: 595 })
//                   .toFile(outputPath);

//               imageUrls.push(filename);

//               fs.unlinkSync(file.path,(err)=>{
//                 if(err){
//                   console.error("Error deleting the original file:", err);
//                 }
//               })
//           } catch (sharpError) {
//               console.error("Sharp Error:", sharpError);
//               throw new Error("Invalid input: Sharp failed to process the image.");
//           }
//       }
//         const newProduct = new Product({
//             productName: productName,
//             productDescription: productDescription,
//             productCategory: productCategory,
//             productBrand: productBrand,
//             productPrice: parseFloat(productPrice),  
//             countStock: parseInt(countStock), 
//             listed: listed || false,
//             images: imageUrls
//         });
//         const productData = await newProduct.save();

//         if (productData) {
//             res.redirect('/admin/productlist');
//         } else {
//             console.log("Error saving product");
//             res.status(500).send("Error saving product.");
//         }
//     } catch (error) {
//         console.error("Error:", error.message);
//         res.status(500).send("Internal server error");
//     }
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
        listed,
      } = req.body;

      if (!productName || typeof productName !== 'string' || productName.trim().length < 3) {
        return res.status(400).json({ message: 'Product name must be a string with at least 3 characters.' });
      }
      
      if (!productDescription || typeof productDescription !== 'string' || productDescription.trim().length < 10) {
        return res.status(400).json({ message: 'Product description must be a string with at least 10 characters.' });
      }
      
      if (!productCategory || typeof productCategory !== 'string' || productCategory.trim().length < 3) {
        return res.status(400).json({ message: 'Product category must be a string with at least 3 characters.' });
      }
      
      if (!productBrand || typeof productBrand !== 'string' || productBrand.trim().length < 2) {
        return res.status(400).json({ message: 'Product brand must be a string with at least 2 characters.' });
      }
      
      if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) {
        return res.status(400).json({ message: 'Product price must be a positive number.' });
      }
      
      if (!countStock || isNaN(countStock) || Number(countStock) < 0) {
        return res.status(400).json({ message: 'Stock count must be a non-negative number.' });
      }

      if (!req.files || req.files.length === 0) {
          return res.status(400).json({ message: 'No files uploaded.' });
      }

      const croppedImagePaths = await Promise.all(
          req.files.map(async (file) => {
              const croppedPath = `${file.destination}/cropped-${file.filename}`;
              const relativePath = `/cropped-${file.filename}`;

              const metadata = await sharp(file.path).metadata();

              await sharp(file.path)
                  .extract({
                      left: Math.floor((metadata.width - 300) / 2),
                      top: Math.floor((metadata.height - 300) / 2),
                      width: 300,
                      height: 300,
                  })
                  .toFile(croppedPath);

              return relativePath;
          })
      );

      const newProduct = new Product({
          productName,
          productDescription,
          productCategory,
          productBrand,
          productPrice: parseFloat(productPrice),
          countStock: parseInt(countStock),
          listed: listed || false,
          images: croppedImagePaths, // Only non-deleted images are passed
      });

      await newProduct.save();
      res.redirect('/admin/productlist');
  } catch (error) {
      console.error('Error inserting product:', error);
      res.status(500).json({ message: 'Error inserting product.', error: error.message });
  }
};

const deleteImageFromProduct = async (req, res) => {
  try {
    const { productId, imageName } = req.body;

    // Validate inputs
    if (!productId || !imageName) {
      return res.status(400).json({ message: 'Product ID and image name are required.' });
    }

    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if the image exists in the product's images array
    if (!product.images.includes(imageName)) {
      return res.status(404).json({ message: 'Image not found in product.' });
    }

    // Remove the image from the images array
    product.images = product.images.filter(image => image !== imageName);
    await product.save();

    // Construct the full file path for the image
    const imagePath = path.join(__dirname, '..', 'public', 'uploads', imageName);

    // Check if the file exists and delete it
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath); // Deletes the image file from the server
      console.log(`Image deleted from server: ${imagePath}`);
    } else {
      console.warn(`Image file not found on the server: ${imagePath}`);
    }

    return res.status(200).json({ message: 'Image deleted successfully.' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ message: 'Error deleting image.', error: error.message });
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
          const { removedImages, productName, productDescription, productCategory, productBrand, productPrice, countStock, listed } = req.body;

          console.log(req.body.removedImages); // Log deleted images in the backend

          const productId = req.query.id;
  
          if (!mongoose.Types.ObjectId.isValid(productId)) {
              return res.status(400).send({ error: 'Invalid product ID' });
          }
  
          const existingProduct = await Product.findById(productId);
          if (!existingProduct) {
              return res.status(404).send({ error: 'Product not found' });
          }
  
          let imageUrls = existingProduct.images || [];
          
          if (removedImages && Array.isArray(removedImages)) {
              // Remove images specified by the client
              imageUrls = imageUrls.filter(image => !removedImages.includes(image));
  
              // Delete the removed images from the filesystem
              for (const image of removedImages) {
                  const imagePath = path.join(__dirname, '../public/uploads', image);
                  try {
                      fs.unlinkSync(imagePath);
                      console.log(`Successfully deleted image: ${image}`);
                  } catch (error) {
                      console.error(`Failed to delete image ${image}:`, error);
                  }
              }
          }
  
          const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (req.files && req.files.length > 0) {
              for (const file of req.files) {
                  if (!allowedImageTypes.includes(file.mimetype)) {
                      errors.push('Invalid file type. Allowed types: ' + allowedImageTypes.join(', '));
                      break;
                  }
  
                  const filename = `${uuidv4()}.jpg`;
                  const imageOutput = path.join(__dirname, '../public/uploads', filename);
  
                  try {
                      await sharp(file.path)
                          .resize({ width: 386, height: 595 })
                          .toFile(imageOutput);
  
                      imageUrls.push(filename);
  
                      try {
                          fs.unlinkSync(file.path);
                      } catch (error) {
                          console.warn(`Failed to delete temporary file: ${file.path}`, error);
                      }
                  } catch (sharpError) {
                      console.error('Error processing image:', sharpError);
                      errors.push('Error processing image.');
                      break;
                  }
              }
  
              if (errors.length > 0) {
                  return res.status(400).json({ errors });
              }
  
              if (imageUrls.length > 4) {
                  imageUrls = imageUrls.slice(0, 4);
              }
          }
  
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
    deleteImage,
    deleteImageFromProduct
    
  }

  