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
        // Determine folder based on route
        let folder = "school_materials";
        if (req.originalUrl && req.originalUrl.includes("/events/")) {
            folder = "event_photos";
        } else if (req.originalUrl && req.originalUrl.includes("/faculty/")) {
            folder = "faculty_profiles";
        }

        return {
            folder: folder,
            resource_type: "auto", // "auto" allows Cloudinary to detect image, video, or raw (PDF/docs)
            public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
            type: "upload",
            access_mode: "public",
        };
    },
});

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return;

        // Extract resourceType and publicId dynamically from URL
        const match = fileUrl.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
        if (match) {
            const resourceType = match[1];
            let publicId = match[2];
            if (resourceType === "image" || resourceType === "video") {
                publicId = publicId.replace(/\.[^/.]+$/, "");
            }

            console.log(`Deleting asset from Cloudinary with public_id: ${publicId} (type: ${resourceType})`);
            // Destroy using correct resource type bucket
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            console.log("Cloudinary deletion result:", result);
            return result;
        }
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
    }
};

export { cloudinary, storage, deleteFromCloudinary };