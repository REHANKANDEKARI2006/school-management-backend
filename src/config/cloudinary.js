import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: "school_materials",
            resource_type: "raw", // To support any file type (PDF, docx, etc.)
            public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
            type: "upload",
            access_mode: "public",
        };
    },
});

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return;

        // Extract public_id from the complete URL
        // Example: https://res.cloudinary.com/.../raw/upload/v1234567/school_materials/file.pdf
        const parts = fileUrl.split("/upload/");
        if (parts.length === 2) {
            let pathAfterUpload = parts[1];

            // Remove the version tag if it exists (e.g., v1234567890/)
            const versionMatch = pathAfterUpload.match(/^v\d+\//);
            if (versionMatch) {
                pathAfterUpload = pathAfterUpload.replace(versionMatch[0], "");
            }

            const publicId = pathAfterUpload; // The full path after version is the public_id for raw files

            console.log("Deleting asset from Cloudinary with public_id:", publicId);
            // Resource type "raw" must be specified to delete raw files successfully
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
            console.log("Cloudinary deletion result:", result);
            return result;
        }
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
    }
};

export { cloudinary, storage, deleteFromCloudinary };