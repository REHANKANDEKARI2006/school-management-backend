import { cloudinary } from '../config/cloudinary.js';

async function testSignedUrl() {
  const publicId = "bulk_documents/1785312228012_Bulk_id-card_whole-school_1785312228011.pdf";

  // Test 1: Signed URL with raw
  const signedUrl1 = cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    secure: true
  });

  // Test 2: Private download URL
  const signedUrl2 = cloudinary.utils.private_download_url(
    publicId,
    'pdf',
    { resource_type: 'raw', attachment: false }
  );

  // Test 3: Standard raw URL with download fl_attachment
  const signedUrl3 = cloudinary.url(publicId, {
    resource_type: 'raw',
    flags: 'attachment',
    secure: true
  });

  console.log("Signed URL 1:", signedUrl1);
  const resp1 = await fetch(signedUrl1);
  console.log("Resp 1 status:", resp1.status, "Content-Type:", resp1.headers.get('content-type'));

  console.log("Signed URL 2:", signedUrl2);
  const resp2 = await fetch(signedUrl2);
  console.log("Resp 2 status:", resp2.status, "Content-Type:", resp2.headers.get('content-type'));

  console.log("Signed URL 3:", signedUrl3);
  const resp3 = await fetch(signedUrl3);
  console.log("Resp 3 status:", resp3.status, "Content-Type:", resp3.headers.get('content-type'));

  process.exit(0);
}

testSignedUrl().catch(console.error);
