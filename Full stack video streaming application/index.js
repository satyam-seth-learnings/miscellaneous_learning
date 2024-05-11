import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";


const app = express();


const storage = multer.diskStorage({
    destination: function(req, file, cb){
      cb(null, "./uploads");
    },
    filename: function(req, file, cb){
      cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
    },
});


app.use(cors(
    {
        origin: [
            "localhost:3000",
        ],
        credentials: true,
    }
));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // watch it
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use("/uploads", express.static("uploads"));


app.get('/', function(req, res) {
    res.json({message: "Hello Chai aur Code"});
});


app.listen(8000, function() {
    console.log('App is listening at 8000...');
});