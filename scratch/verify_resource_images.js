const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Helper to make HTTP requests
function request(method, pathName, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + pathName);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { ...headers }
    };

    let body = null;
    if (data && !(data instanceof Buffer) && !headers['Content-Type']?.includes('multipart/form-data')) {
      body = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    } else if (data instanceof Buffer) {
      body = data;
      options.headers['Content-Length'] = body.length;
    }

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => (resBody += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resBody, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Multipart form-data builder
function buildMultipartFormData(fields = {}, files = []) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const chunks = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
    ));
  }

  for (const file of files) {
    const filename = file.filename || 'image.png';
    const fieldname = file.fieldname || 'images';
    const contentType = file.contentType || 'image/png';
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldname}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    ));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const bodyBuffer = Buffer.concat(chunks);
  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': bodyBuffer.length
  };

  return { bodyBuffer, headers };
}

// Small valid PNG buffer (1x1 pixel)
const samplePngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Small valid SVG string/buffer
const sampleSvgBuffer = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
  'utf8'
);

async function runTests() {
  console.log('================================================================');
  console.log('  RESOURCEHUB M18 — ADVANCED RESOURCE IMAGE MANAGEMENT TESTS   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();

    // 1. Setup Owner and Non-Owner accounts
    console.log('--- 1. User Setup ---');
    const ownerEmail = `imgowner_${timestamp}@university.edu`;
    const buyerEmail = `imgbuyer_${timestamp}@university.edu`;

    await request('POST', '/auth/register', {
      name: 'Image Owner',
      email: ownerEmail,
      password: 'Password123!',
      department: 'Engineering',
      year_of_study: 3
    });
    const ownerLogin = await request('POST', '/auth/login', {
      email: ownerEmail,
      password: 'Password123!'
    });
    const ownerToken = ownerLogin.data?.data?.token;
    assert(ownerToken, 'Owner registered and logged in successfully.');

    await request('POST', '/auth/register', {
      name: 'Image Buyer',
      email: buyerEmail,
      password: 'Password123!',
      department: 'Science',
      year_of_study: 2
    });
    const buyerLogin = await request('POST', '/auth/login', {
      email: buyerEmail,
      password: 'Password123!'
    });
    const buyerToken = buyerLogin.data?.data?.token;
    assert(buyerToken, 'Buyer registered and logged in successfully.');

    // 2. Test Image Upload Endpoint (/api/resources/upload)
    console.log('\n--- 2. Image Upload & Validation Tests ---');

    // 2a. Reject invalid file format (text file)
    const textFile = {
      fieldname: 'images',
      filename: 'malicious.txt',
      contentType: 'text/plain',
      buffer: Buffer.from('This is a text file, not an image.')
    };
    const { bodyBuffer: textBody, headers: textHeaders } = buildMultipartFormData({}, [textFile]);
    const uploadTextRes = await request('POST', '/resources/upload', textBody, {
      ...textHeaders,
      Authorization: `Bearer ${ownerToken}`
    });
    assert(
      uploadTextRes.status === 400 && uploadTextRes.data.success === false,
      `Rejected invalid file format (.txt) with status 400: "${uploadTextRes.data.message}"`
    );

    // 2b. Reject oversized file (> 5MB)
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024); // 5.2MB
    const largeFile = {
      fieldname: 'images',
      filename: 'large.png',
      contentType: 'image/png',
      buffer: largeBuffer
    };
    const { bodyBuffer: largeBody, headers: largeHeaders } = buildMultipartFormData({}, [largeFile]);
    const uploadLargeRes = await request('POST', '/resources/upload', largeBody, {
      ...largeHeaders,
      Authorization: `Bearer ${ownerToken}`
    });
    assert(
      uploadLargeRes.status === 400 && uploadLargeRes.data.success === false,
      `Rejected oversized file (>5MB) with status 400: "${uploadLargeRes.data.message}"`
    );

    // 2c. Reject more than 5 images in single upload
    const sixFiles = [1, 2, 3, 4, 5, 6].map(i => ({
      fieldname: 'images',
      filename: `test_${i}.png`,
      contentType: 'image/png',
      buffer: samplePngBuffer
    }));
    const { bodyBuffer: sixBody, headers: sixHeaders } = buildMultipartFormData({}, sixFiles);
    const uploadSixRes = await request('POST', '/resources/upload', sixBody, {
      ...sixHeaders,
      Authorization: `Bearer ${ownerToken}`
    });
    assert(
      uploadSixRes.status === 400 && uploadSixRes.data.success === false,
      `Rejected upload exceeding 5 images with status 400: "${uploadSixRes.data.message}"`
    );

    // 2d. Successfully upload and optimize valid images (PNG and SVG)
    const validFiles = [
      { fieldname: 'images', filename: 'preview1.png', contentType: 'image/png', buffer: samplePngBuffer },
      { fieldname: 'images', filename: 'preview2.png', contentType: 'image/png', buffer: samplePngBuffer },
      { fieldname: 'images', filename: 'vector.svg', contentType: 'image/svg+xml', buffer: sampleSvgBuffer }
    ];
    const { bodyBuffer: validBody, headers: validHeaders } = buildMultipartFormData({}, validFiles);
    const uploadValidRes = await request('POST', '/resources/upload', validBody, {
      ...validHeaders,
      Authorization: `Bearer ${ownerToken}`
    });
    assert(
      uploadValidRes.status === 200 && uploadValidRes.data.success === true,
      `Uploaded 3 valid images successfully (status 200).`
    );
    assert(
      uploadValidRes.data.data.length === 3,
      `Received 3 processed image records from upload.`
    );

    const uploadedUrls = uploadValidRes.data.data.map(d => d.image_url);
    console.log('   Uploaded URLs:', uploadedUrls);

    // Verify local disk files exist
    for (const imgUrl of uploadedUrls) {
      const diskPath = path.join(__dirname, '../server', imgUrl);
      assert(fs.existsSync(diskPath), `Uploaded file exists on disk: ${imgUrl}`);
    }

    // 3. Create Resource with Multiple Images
    console.log('\n--- 3. Listing Creation with Multiple Images ---');
    const catRes = await request('GET', '/categories');
    const categoryId = catRes.data.data[0].id;

    const createMultiRes = await request(
      'POST',
      '/resources',
      {
        title: 'Organic Chemistry Model Kit (Multi-Image)',
        description: 'Complete molecular modeling set with 120 pieces. Excellent for Chem 201.',
        category_id: categoryId,
        exchange_type: 'SELL',
        price: 35.00,
        item_condition: 'LIKE_NEW',
        meetup_location: 'Science Building 2nd Floor',
        images: [
          { image_url: uploadedUrls[0], is_primary: false },
          { image_url: uploadedUrls[1], is_primary: true }, // Explicitly set 2nd as primary
          { image_url: uploadedUrls[2], is_primary: false }
        ]
      },
      { Authorization: `Bearer ${ownerToken}` }
    );

    assert(createMultiRes.status === 201, `Created resource listing with multiple images (status 201).`);
    const multiResourceId = createMultiRes.data.data.id;

    // 4. Verify Resource Details and Marketplace Representation
    console.log('\n--- 4. Verify Resource Details & Primary Image ---');
    const getDetailsRes = await request('GET', `/resources/${multiResourceId}`);
    assert(getDetailsRes.status === 200, `Fetched resource details successfully.`);
    const detailsImages = getDetailsRes.data.data.images;
    assert(detailsImages && detailsImages.length === 3, `Resource has exactly 3 images attached.`);

    const primaryImageRecord = detailsImages.find(img => img.is_primary === true);
    assert(
      primaryImageRecord && primaryImageRecord.image_url === uploadedUrls[1],
      `Primary image correctly matches explicit primary: ${uploadedUrls[1]}`
    );

    // Verify Marketplace GET /resources has primary image
    const marketRes = await request('GET', `/resources?search=Organic Chemistry Model Kit`);
    assert(marketRes.status === 200, `Queried marketplace for newly listed resource.`);
    const matchedResource = marketRes.data.data.find(r => r.id === multiResourceId);
    assert(
      matchedResource && matchedResource.image_url === uploadedUrls[1],
      `Marketplace card displays primary image URL in image_url field.`
    );

    // 5. Test Backward Compatibility: Single image_url string
    console.log('\n--- 5. Backward Compatibility Test (Single image_url) ---');
    const legacyListingRes = await request(
      'POST',
      '/resources',
      {
        title: 'Legacy Physics Workbook',
        description: 'Physics 101 textbook and workbook, clean condition.',
        category_id: categoryId,
        exchange_type: 'SELL',
        price: 15.00,
        item_condition: 'GOOD',
        meetup_location: 'Library Entrance',
        image_url: 'https://example.com/legacy_book.jpg'
      },
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(legacyListingRes.status === 201, `Successfully created legacy listing with single image_url string.`);
    const legacyId = legacyListingRes.data.data.id;
    const legacyDetails = await request('GET', `/resources/${legacyId}`);
    assert(
      legacyDetails.data.data.images.length === 1 && legacyDetails.data.data.images[0].is_primary === true,
      `Legacy image_url automatically stored as primary image in resource_images.`
    );

    // 6. Test Image Management Endpoints (Ownership, Primary Toggle, Deletion, Caps)
    console.log('\n--- 6. Image Management Endpoints & Ownership Security ---');

    // 6a. Non-owner cannot add image (403)
    const nonOwnerAddRes = await request(
      'POST',
      `/resources/${multiResourceId}/images`,
      { image_url: 'https://example.com/unauthorized.jpg' },
      { Authorization: `Bearer ${buyerToken}` }
    );
    assert(nonOwnerAddRes.status === 403, `Non-owner rejected with 403 Forbidden on POST /:id/images.`);

    // 6b. Owner adds 4th image
    const add4Res = await request(
      'POST',
      `/resources/${multiResourceId}/images`,
      { image_url: 'https://example.com/item_angle_4.jpg' },
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(add4Res.status === 201, `Owner successfully added 4th image (status 201).`);

    // 6c. Owner adds 5th image
    const add5Res = await request(
      'POST',
      `/resources/${multiResourceId}/images`,
      { image_url: 'https://example.com/item_angle_5.jpg' },
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(add5Res.status === 201, `Owner successfully added 5th image (status 201).`);

    // 6d. Reject 6th image (exceeds max 5)
    const add6Res = await request(
      'POST',
      `/resources/${multiResourceId}/images`,
      { image_url: 'https://example.com/item_angle_6.jpg' },
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(add6Res.status === 400, `Rejected 6th image with status 400 (exceeds 5-image cap): "${add6Res.data.message}"`);

    // 6e. Switch primary image
    const refreshedDetails = await request('GET', `/resources/${multiResourceId}`);
    const fourthImage = refreshedDetails.data.data.images.find(img => img.image_url.includes('angle_4'));
    assert(fourthImage, 'Found 4th image record in resource images.');

    // Non-owner cannot set primary (403)
    const nonOwnerPrimaryRes = await request(
      'PATCH',
      `/resources/${multiResourceId}/images/${fourthImage.id}/primary`,
      {},
      { Authorization: `Bearer ${buyerToken}` }
    );
    assert(nonOwnerPrimaryRes.status === 403, `Non-owner rejected with 403 Forbidden on primary image patch.`);

    // Owner sets 4th image as primary
    const setPrimaryRes = await request(
      'PATCH',
      `/resources/${multiResourceId}/images/${fourthImage.id}/primary`,
      {},
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(setPrimaryRes.status === 200, `Owner updated primary image (status 200).`);

    const afterPrimaryDetails = await request('GET', `/resources/${multiResourceId}`);
    const updatedPrimary = afterPrimaryDetails.data.data.images.find(img => img.is_primary === true);
    assert(
      updatedPrimary && updatedPrimary.id === fourthImage.id,
      `Verified 4th image is now the primary image in resource details.`
    );

    // 6f. Delete image & auto-promote primary
    // Non-owner cannot delete image (403)
    const nonOwnerDelRes = await request(
      'DELETE',
      `/resources/${multiResourceId}/images/${fourthImage.id}`,
      {},
      { Authorization: `Bearer ${buyerToken}` }
    );
    assert(nonOwnerDelRes.status === 403, `Non-owner rejected with 403 Forbidden on image DELETE.`);

    // Owner deletes the currently primary image (fourthImage)
    const ownerDelRes = await request(
      'DELETE',
      `/resources/${multiResourceId}/images/${fourthImage.id}`,
      {},
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert(ownerDelRes.status === 200, `Owner deleted primary image successfully (status 200).`);

    // Verify auto-promotion: oldest remaining image must now be primary
    const afterDeleteDetails = await request('GET', `/resources/${multiResourceId}`);
    const remainingImages = afterDeleteDetails.data.data.images;
    assert(remainingImages.length === 4, `Resource now has 4 remaining images.`);
    const newPrimary = remainingImages.find(img => img.is_primary === true);
    assert(
      newPrimary !== undefined,
      `Oldest remaining image was automatically promoted to primary: ${newPrimary?.image_url}`
    );

    // Also verify disk cleanup on deleting local file
    const localImgToDelete = remainingImages.find(img => img.image_url.startsWith('/uploads/'));
    if (localImgToDelete) {
      const localFilePath = path.join(__dirname, '../server', localImgToDelete.image_url);
      assert(fs.existsSync(localFilePath), `Local file exists before deletion: ${localImgToDelete.image_url}`);
      const delLocalRes = await request(
        'DELETE',
        `/resources/${multiResourceId}/images/${localImgToDelete.id}`,
        {},
        { Authorization: `Bearer ${ownerToken}` }
      );
      assert(delLocalRes.status === 200, `Deleted local file image.`);
      assert(!fs.existsSync(localFilePath), `Local disk file was safely unlinked on delete.`);
    }

  } catch (err) {
    console.error('\n[UNEXPECTED ERROR DURING TESTS]:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  M18 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
