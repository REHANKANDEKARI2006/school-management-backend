import { cloudinary } from '../config/cloudinary.js';

async function testPrivateDownload() {
  const publicId = "bulk_documents/1785312228012_Bulk_id-card_whole-school_1785312228011.pdf";

  const url = cloudinary.utils.private_download_url(
    publicId,
    '',
    { resource_type: 'raw', type: 'upload', attachment: false }
  );

  console.log("Private download URL:", url);

  const resp = await fetch(url);
  console.log("Status:", resp.status, "Content-Type:", resp.headers.get('content-type'));

  process.exit(0);
}

testPrivateDownload().catch(console.error);
