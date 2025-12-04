import multer from "multer"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}` )
  }
})


function fileFilter (req, file, cb) {

const allowedType = ["image/jpeg","image/png","image/jpg"]
if(allowedType.includes(file.mimetype)){
  cb(null,true)
}
else{
    cb(new Error('.PNG ,JPG , .JPEG are allow Only..!'),false)
}
}

const upload = multer({ storage,fileFilter })
export default upload