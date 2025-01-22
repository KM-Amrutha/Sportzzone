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

  
  const addCategory = async (req, res) => {
    try {
      const { catName, description } = req.body;
  
      if (!catName || !description) {
        return res.render("admin/addCategory", {
          message: "Name and Descriptions are required.",
          category: await category.find({}),
        });
      }
  
      const exists = await category.findOne({
        catName: { $regex: new RegExp("^" + catName + "$", "i") },
      });
  
      if (exists) {
        return res.render("addCategory", {
          message: "Category already exists.",
          category: await category.find({}),
        });
      }
  
      const categories = new category({ catName, description });
      await categories.save();
  
      res.redirect("/admin/addCategory");
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Error in adding category.");
    }
  };

  


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
    
    console.log("edit details got",req.body);  
    
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


  
    const catid= req.query.catid
    console.log("Category ID:", catid);
    const categories = await category.findOne({_id:catid}); 

    console.log(categories)

    categories.is_Active =!categories.is_Active
    await categories.save()

    console.log("Category status updated successfully");
    
    res.redirect("/admin/addCategory")


  } catch(error){
    console.log(error.message);
    res.status(500).send("Server Error");

  }
}









  module.exports= {
    loadCategory,
    addCategory,
    ToggleblockCategory,
    
    loadeditCategory,
    editCategory,

    
    
  
  
  }