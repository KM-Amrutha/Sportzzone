const category=require('../models/categoryModel')
const product = require('../models/productModel')


const loadCategory = async (req,res) =>{
    try{
      console.log("category page rendered")
        const Category = await category.find();
      
        console.log(Category,"this is from the cater");
        res.render("admin/addCategory",{categories:Category})
    }catch(error){
      console.log("Error in laoding page",error.message);
      res.status(500).send("Internal server error")
    }
  };

  
  const addCategory = async(req, res) => {
    console.log("hii for load");
    try {
      
      const { catName,description} = req.body;
      const catData= await category.find({})
      console.log(req.body,"req body is getting");

      
      if(catData== ''){
        res.render("addCategory", {message:"categroy name is required", category:catData})
      }
    
         const exists = await category.findOne( { catName: { $regex: new RegExp('^' + catName + '$', 'i') } });
         console.log(exists," PERU exist cheyyundo nokkan");
            if (exists) {
               const categoryData = await category.find({})
              res.render('addCategory',{message:"Category already exists",category:categoryData})
                 }
      const categories = new category({
        catName,
        description
    
      });
      await categories.save();
      console.log("savedddddd");
      res.redirect("/admin/addCategory")
    }
   
    catch(error){
      console.error(error.message);
      res.status(500).send("Error in adding Categroy")
    }
  }
//   const categoryData =  async(req,res)=>{

//     console.log("hiiiiiiii");
//     try{
// const categoryData= await cat.find()
//   console.log(categoryData,"cat data is here");
//          if(categoryData){
//         res.render('admin/addCategory',{categories : categoryData})
//          }
//   } 
//     catch(error){
//       console.log(error.message);
//     }
  // }
  const loadeditCategory = async(req,res)=>{
    try {
      console.log("kittyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
        const categories = await category.findById(req.query.id);
        req.session.cateid=req.query.id
        res.render('admin/editCategory',{categories})
    } catch (error) {
        console.error(error)
    }}

const editCategory= async (req,res)=>{
  try{

    const { catName,description} = req.body
    console.log("edit details got",req.body)
    
    const existingCategory = await category.findOne({_id: { $ne: req.query.id }, catName: { $regex: new RegExp('^' + catName + '$', 'i') } });
    if(existingCategory){
         res.json({ success: false, error: 'Category name must be unique' });       
     }else{
        //  res.json({ success: true, error: 'Category name changed successfully' });       
         const edited = await category.findByIdAndUpdate({ _id: req.query.id }, { $set: {  catName, description } })
         if(edited){
           res.redirect("/admin/addCategory")
         }else{
          console.error(error)
         }

     }

  }catch(error){
console.log(error); 
  }
}
const ToggleblockCategory= async (req,res)=>{
  try{


    console.log("sanam kityyyyyyyyyyyyyyyyyyyyy")
    const catid= req.query.catid
    const categories = await category.findOne({_id:catid}); 
    categories.is_Active =!categories.is_Active
    await categories.save()
    res.redirect("/admin/addCategory")


  } catch(error){
console.log(error);
  }
}


  const filterCategory = async (req, res) => {
    try {
        const categoryId = req.query.id;

        if (!categoryId) {
            return res.status(400).send('Category ID is required');
        }

        const products = await product.find({ category: categoryId });

        res.render('homePage', { products }); // Assuming you have a view called 'filteredProducts'
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};







  module.exports= {
    loadCategory,
    addCategory,
    ToggleblockCategory,
    // categoryData
    loadeditCategory,
    editCategory,
    filterCategory
  
  
  }