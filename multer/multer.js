const multer = require('multer')
const path = require('path');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/uploads/');
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1000000 },
//     fileFilter: (req, file, cb) => {
//         checkFileType(file, cb);
//     }
// }).array('image', 4); 

// function checkFileType(file, cb) {
    
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);

//     if (mimetype && extname) {
//         return cb(null, true);
//     } else {
//         cb('Error: Images Only!');
//     }
// }
// module.exports = { upload };


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        
        const uploadPath = path.join(__dirname, '../public/uploads');
    
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});


const upload = multer({ storage: storage ,
    limits: { fileSize: 1000000 }
});

module.exports = {upload}
