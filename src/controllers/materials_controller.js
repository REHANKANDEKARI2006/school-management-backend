import MaterialsService from "../services/materials_service.js";
import { cloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import https from "https";
import http from "http";

export const MaterialsController = {

  async getAllMaterials(req, res) {
    try {
      const { class_id } = req.query;
      const data = await MaterialsService.getAllMaterials(class_id, req.instituteId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getMaterial(req, res) {
    try {
      const data = await MaterialsService.getMaterialById(req.params.id, req.instituteId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async addMaterial(req, res) {
    console.log("Adding material with payload:", req.body);
    try {
      const material = await MaterialsService.addMaterial(req.body, req.instituteId);
      res.json({
        success: true,
        message: "Material added successfully",
        data: material
      });
    } catch (error) {
      console.error("Error adding material:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateMaterial(req, res) {
    try {
      const material = await MaterialsService.updateMaterial(
        req.params.id,
        req.body,
        req.instituteId
      );
      res.json({
        success: true,
        message: "Material updated successfully",
        data: material
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteMaterial(req, res) {
    try {
      const materialId = req.params.id;
      const material = await MaterialsService.getMaterialById(materialId, req.instituteId);

      if (!material) {
        return res.status(404).json({ success: false, message: "Material not found" });
      }

      // First delete from Cloudinary
      if (material.file_path) {
        await deleteFromCloudinary(material.file_path);
      }

      // Then delete from the database
      await MaterialsService.deleteMaterial(materialId, req.instituteId);

      res.json({
        success: true,
        message: "Material deleted successfully"
      });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async uploadMaterialFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file provided" });
      }

      res.json({
        success: true,
        message: "File uploaded successfully",
        fileUrl: req.file.path
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ success: false, message: error.message || "File upload failed" });
    }
  },

  async downloadMaterialFile(req, res) {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

      const materialId = parseInt(req.params.id);
      const material = await MaterialsService.getMaterialById(materialId, req.instituteId);

      if (!material || !material.file_path) {
        return res.status(404).json({
          success: false,
          message: "Material file not found"
        });
      }

      // 1. Google Drive Link Handling (Legacy)
      // Google drive links generally contain 'drive.google.com'
      if (material.file_path.includes("drive.google.com")) {
        console.log(`[Download] Legacy Google Drive link detected: ${material.file_path}`);
        return res.json({
          success: true,
          isExternal: true,
          url: material.file_path
        });
      }

      // 2. Cloudinary Link Handling (Generate Signed Download URL instead of proxy)
      let fileUrl = material.file_path;

      // Extract publicId and resourceType dynamically
      const extractFileInfo = (url) => {
        const match = url.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
        if (match) {
          const resourceType = match[1];
          let publicId = match[2];
          if (resourceType === "image" || resourceType === "video") {
            publicId = publicId.replace(/\.[^/.]+$/, "");
          }
          return {
            resourceType,
            publicId
          };
        }
        return null;
      };

      if (fileUrl) {
        const fileUrls = fileUrl.split(",");
        const signedUrls = [];

        for (const url of fileUrls) {
          if (url.includes("drive.google.com")) {
            signedUrls.push(url);
          } else if (url.includes("res.cloudinary.com")) {
            const fileInfo = extractFileInfo(url);
            if (fileInfo) {
              const { resourceType, publicId } = fileInfo;
              const isView = req.query.view === "true";
              const downloadUrl = cloudinary.utils.private_download_url(
                  publicId, '', 
                  { resource_type: resourceType, type: "upload", attachment: !isView }
              );
              signedUrls.push(downloadUrl);
            } else {
              signedUrls.push(url);
            }
          } else {
            signedUrls.push(url);
          }
        }

        console.log(`[Download] Generated signed urls for material ${materialId}: count = ${signedUrls.length}`);
        return res.json({
          success: true,
          isExternal: true,
          url: signedUrls[0],
          urls: signedUrls
        });
      }

      // If for some reason it's an unrecognized file_path, just return the direct URL to the frontend
      return res.json({
        success: true,
        isExternal: true,
        url: fileUrl
      });
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Diagnostic Mode: Test Cloudinary Stream Independently
  async diagnosticDownload(req, res) {
    try {
      const materialId = parseInt(req.params.id);
      const material = await MaterialsService.getMaterialById(materialId, req.instituteId);

      if (!material || !material.file_path) {
        return res.status(404).json({ success: false, message: "[Diagnostic] Material DB record not found or no file_path." });
      }

      console.log(`[Diagnostic] Attempting to reach Cloudinary URL: ${material.file_path}`);

      const fileUrl = material.file_path;
      const client = fileUrl.startsWith("https") ? https : http;

      client.get(fileUrl, (response) => {
        let body = "";

        // Let's grab the first chunk to see what Cloudinary is actually returning!
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => {
          console.log(`[Diagnostic] Cloudinary Status Code: ${response.statusCode}`);
          res.json({
            success: response.statusCode < 400,
            cloudinary_status: response.statusCode,
            cloudinary_headers: response.headers,
            db_url: fileUrl,
            message: response.statusCode < 400 ? "Cloudinary URL is fully reachable!" : "Cloudinary rejected the request!",
            response_preview: body.substring(0, 200) // First 200 chars of Cloudinary error (usually XML or HTML)
          });
        });
      }).on("error", (err) => {
        res.status(500).json({ success: false, message: "[Diagnostic] Server failed to make request to Cloudinary", error: err.message });
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};