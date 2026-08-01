import { cloudinary } from '../config/cloudinary.js';
import { PDFDocument } from 'pdf-lib';

async function testCloudinaryOptions() {
  console.log("Testing Cloudinary PDF options for public browser viewing...");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  page.drawText("Test PDF Document Content", { x: 50, y: 350, size: 20 });
  const pdfBuffer = Buffer.from(await pdfDoc.save());

  const testConfigs = [
    { name: "raw_public", opts: { folder: 'bulk_documents', resource_type: 'raw', type: 'upload', access_mode: 'public' } },
    { name: "auto_public", opts: { folder: 'bulk_documents', resource_type: 'auto', type: 'upload', access_mode: 'public' } },
    { name: "image_pdf", opts: { folder: 'bulk_documents', resource_type: 'image', format: 'pdf', type: 'upload', access_mode: 'public' } },
    { name: "raw_attachment", opts: { folder: 'bulk_documents', resource_type: 'raw', flags: 'attachment' } },
  ];

  for (const item of testConfigs) {
    try {
      const url = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { ...item.opts, public_id: `test_${item.name}_${Date.now()}` },
          (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          }
        );
        stream.end(pdfBuffer);
      });

      const resp = await fetch(url);
      console.log(`Config [${item.name}]: Status = ${resp.status}, Content-Type = ${resp.headers.get('content-type')}`);
      console.log(`   URL: ${url}`);
    } catch (e) {
      console.error(`Config [${item.name}] FAILED:`, e.message);
    }
  }

  process.exit(0);
}

testCloudinaryOptions().catch(err => {
  console.error(err);
  process.exit(1);
});
