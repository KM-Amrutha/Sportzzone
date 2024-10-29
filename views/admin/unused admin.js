
const loadCoupon = async (req, res) => {
    try {
        const couponData = await coupon.find().sort({ Date: -1 });
  
      
        res.render('admin/coupon', { couponData, error: null });
    } catch (error) {
        console.error(error.message);
      
        res.render('admin/coupon', { couponData: [],error: 'Internal Server Error. Please try again.' });
    }
  };

  