import { cloudinary } from '../config/cloudinary.js';
import { PDFDocument } from 'pdf-lib';

async function testPdfUpload() {
  console.log("Testing Cloudinary PDF upload content-type...");

  // Create a minimal valid PDF
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([600, 400]);
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  // Test 1: resource_type: 'auto'
  const autoUrl = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'test_pdfs',
        resource_type: 'auto',
        format: 'pdf',
        public_id: `test_auto_${Date.now()}`
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(pdfBuffer);
  });

  // Test 2: resource_type: 'image' (Cloudinary PDF handling as document image)
  const imageUrl = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'test_pdfs',
        resource_type: 'image',
        format: 'pdf',
        public_id: `test_image_${Date.now()}`
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(pdfBuffer);
  });

  console.log("Auto URL:", autoUrl);
  console.log("Image URL:", imageUrl);

  // Fetch headers for autoUrl
  const resAuto = await fetch(autoUrl);
  console.log("Auto URL Content-Type:", resAuto.headers.get('content-type'), "Status:", resAuto.status);

  // Fetch headers for imageUrl
  const resImage = await fetch(imageUrl);
  console.log("Image URL Content-Type:", resImage.headers.get('content-type'), "Status:", resImage.status);

  process.exit(0);
}

testPdfUpload().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
