const category=require('../models/categoryModel')
const product = require('../models/productModel')


const loadCategory = async (req,res) =>{
    try{
        const Category = await category.find();
        res.render("admin/addCategory",{categories:Category})
    }catch(error){
      console.log("Error in laoding page",error.message);
      res.status(500).send("Internal server error")
    }
  };

  
  const addCategory = async (req, res) => {
    try {
        const { catName, description } = req.body;

       
        const trimmedCatName = catName.trim();
        const trimmedDescription = description.trim();
        const nameRegex = /^[A-Za-z\s]+$/;

       console.log('the body get :', req.body);
       
        if (!trimmedCatName || !trimmedDescription) {
            return res.render("admin/addCategory", {
                message: "Name and Description are required.",
                categories: await category.find({}),
            });
        }

        if (!nameRegex.test(trimmedCatName)) {
            return res.render("admin/addCategory", {
                message: "Category name should contain only letters and spaces.",
                categories: await category.find({}),
            });
        }

        // Check if category already exists
        const exists = await category.findOne({
            catName: { $regex: new RegExp("^" + trimmedCatName + "$", "i") },
        });

        if (exists) {
            return res.render("admin/addCategory", {
                message: "Category already exists.",
                categories: await category.find({}),
            });
        }

        // Add the category
        const newCategory = new category({
            catName: trimmedCatName,
            description: trimmedDescription,
        });

        await newCategory.save();

        // Redirect after successful category creation
        res.redirect('/admin/addCategory'); // Redirect to the category list page

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error, Please try again later.");
    }
};



  const loadeditCategory = async(req,res)=>{
    try {
      console.log("edit category ilottu vannu")
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