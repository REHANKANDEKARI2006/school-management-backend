// One-time script to make all existing Cloudinary files public
// Run with: node src/scripts/fix_cloudinary_access.js

import { cloudinary } from "../config/cloudinary.js";
import MaterialsService from "../services/materials_service.js";

async function fixAccess() {
    try {
        const materials = await MaterialsService.getAllMaterials();

        for (const material of materials) {
            if (material.file_path && material.file_path.includes("res.cloudinary.com")) {
                // Extract public_id
                const parts = material.file_path.split("/upload/");
                if (parts.length === 2) {
                    let pathAfterUpload = parts[1];
                    const versionMatch = pathAfterUpload.match(/^v\d+\//);
                    if (versionMatch) {
                        pathAfterUpload = pathAfterUpload.replace(versionMatch[0], "");
                    }
                    const publicId = pathAfterUpload;

                    try {
                        console.log(`Updating access for: ${publicId}`);
                        const result = await cloudinary.api.update(publicId, {
                            resource_type: "raw",
                            access_mode: "public",
                        });
                        console.log(`  ✅ Updated: ${result.public_id} -> access_mode: ${result.access_mode}`);
                    } catch (err) {
                        console.error(`  ❌ Failed for ${publicId}:`, err.message);
                    }
                }
            }
        }

        console.log("\nDone! All files should now be publicly accessible.");
        process.exit(0);
    } catch (error) {
        console.error("Script error:", error);
        process.exit(1);
    }
}

fixAccess();
