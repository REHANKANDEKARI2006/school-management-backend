import multer from "multer";
import { storage } from "../config/cloudinary.js";

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

export default upload;
