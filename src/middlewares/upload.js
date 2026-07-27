import multer from "multer";
import { storage } from "../config/cloudinary.js";

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    }
});

export default upload;
