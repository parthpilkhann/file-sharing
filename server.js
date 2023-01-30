const multer = require('multer')                // multer is a middleware to handle multipart and form data
const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()
const File = require("./models/File")
const bcrypt = require("bcrypt")


const app = express();
app.use(express.urlencoded({ extended: true }))      // by default express cannot read multipart form, hence this line is added to tell express to read the form in url encoded form(or something like that)
const upload = multer({ dest: "uploads" });         // set the destination of the file, (note: by default multer can read the multipart form hence no line is needed)
mongoose.connect(process.env.DATABASE_URL)

app.set('view engine', 'ejs');

// fn that renders the index.ejs when "/" is entered
app.get('/', (req, res) => {            // the req comes from the browser and res is sent back to browser from here, 
    res.render('index')                 // here we r sending the res, and res ke saath hm index.js file ka html render krne ka bhi command bhej rhe h.
})


// fn to upload the a file
// here we are doing something with the req (upload.single), before sending the response back hence it is middleware. 
app.post('/upload', upload.single("file"), async (req, res) => {     //here when the req from browser comes it brings along a file with it,
    //                                                         // and that we are uploading using multer (note that in index.ejs' html we named the input tag as file, it is the same tag that is being used), after doing that we are sending res to the browser
    //res.send("file uploaded")                                // and the response contains text "file uploaded" with it

    //--- now instaed of sending "file uploaded", we will save our file to data base.
    const fileData = {                                  // variable declared to  store the properties of the file.
        path: req.file.path,                            // while we use multer it gives us the file property which has many features (path is noe of them), dont get confused with the "file", the name file in(upload.single("file") is from html where file used here is the property)
        originalName: req.file.originalname,            // for password, we will hash it and then put it in the fileData variable  
    }
    if (req.body.password != null && req.body.password !== "") {        // both the above are handled by multer whereas the password is handled by express.
        fileData.password = await bcrypt.hash(req.body.password, 10)    // argument 10 means salt.
    }

    const file = await File.create(fileData)                        // we have created a brand new file using the properties of file user updated
    console.log(file);                              // check terminal... we have many properties, one of them is id which we will use in searching our database and download our file which we uploaded
    //res.send(file.originalName)                     //after saving the file we are just displaying the name of the file on the upload url
    res.render('index', { fileLink: `${req.headers.origin}/file/${file.id}` })      //yha hm file upload hone k baad 2 cheezein render krre h...index page and upload ki hui file ka download link
    //                                                                            //yha hmne link wale agumrnt ko object is liye bnaya taaki hm fileLink variable ka use index.ejs me kr ske  

})


// fn to down the file that has been uploaded (both cases are included...1 when there is no password..2 when there is a password)
// app.get("/file/:id", handleDownlaod)                 // basically means if in the route instead of ":id" any file name is given, search for it and run the fn
// app.post("/file/:id", handleDownlaod)                 
app.route("/file/:id").get(handleDownload).post(handleDownload)   // !!!!===  NOT CLEAR  ====!!!! 

async function handleDownload(req, res) {
    const file = await File.findById(req.params.id)        // fetched the file from database with the id 

    if (file.password != null) {           // matlb jo file db se nikali h usme hamne password daala tha ya nhi,agr dala tha to agli condition check kro
        if (req.body.password == null) {    //  agr req ki body me koi password nhi h to user ko password page pe bhejdo
            res.render('password')        // render thhe password page
            return                        // means usne password page pe password daaldia, ab user ko iss pure fn se bahr krdo taaki neeche likha file download code execute naa ho jae 
        }
        if (!await bcrypt.compare(req.body.password, file.password)) {    //agr dono password match nhi kr rhe to
            res.render('password', { error: true })                       // password page ko dobara render kro, error k saath
            return
        }
    }
    file.downloadCount++
    console.log(file.downloadCount);
    await file.save();
    res.download(file.path, file.originalName)

}





app.listen(process.env.PORT)