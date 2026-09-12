const db = require('../config/database');
const { notifyWishlistAvailability, notifyWishlistCategoryMatch } = require('../services/notificationService');
const { processAndSaveImages, deleteImageFile } = require('../services/imageService');

// 1. Get Categories
const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, slug FROM categories ORDER BY name ASC');
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching categories.'
    });
  }
};

// 2. Create Resource
const createResource = async (req, res) => {
  try {
    let { title, description, category_id, exchange_type, price, item_condition, meetup_location, image_url, images } = req.body;
    const owner_id = req.user.id; // From protected token middleware

    // Validate presence
    if (!title || !description || category_id === undefined || !exchange_type || !item_condition || !meetup_location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required resource listing fields.'
      });
    }

    title = typeof title === 'string' ? title.trim() : '';
    description = typeof description === 'string' ? description.trim() : '';
    meetup_location = typeof meetup_location === 'string' ? meetup_location.trim() : '';
    image_url = image_url ? image_url.trim() : null;

    if (!title || !description || !meetup_location) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and meetup location cannot be blank.'
      });
    }

    // Validate Exchange Type
    const validExchangeTypes = ['SELL', 'BORROW', 'DONATE', 'SWAP'];
    if (!validExchangeTypes.includes(exchange_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exchange type. Must be SELL, BORROW, DONATE, or SWAP.'
      });
    }

    // Validate Item Condition
    const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
    if (!validConditions.includes(item_condition.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item condition value.'
      });
    }

    // Validate price matching exchange type
    let finalPrice = null;
    if (exchange_type.toUpperCase() === 'SELL') {
      if (price === undefined || price === null || price === '') {
        return res.status(400).json({
          success: false,
          message: 'Price is required for SELL listings.'
        });
      }
      finalPrice = parseFloat(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price cannot be negative or invalid.'
        });
      }
    }

    // Verify Category exists
    const [categories] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!categories || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category does not exist.'
      });
    }

    // Insert Resource
    const [result] = await db.query(
      `INSERT INTO resources 
      (owner_id, title, description, category_id, exchange_type, price, item_condition, meetup_location, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
      [owner_id, title, description, category_id, exchange_type.toUpperCase(), finalPrice, item_condition.toUpperCase(), meetup_location]
    );

    const resourceId = result.insertId;

    // Handle images: Support both new `images` array and legacy `image_url` string
    if (Array.isArray(images) && images.length > 0) {
      const validImages = images
        .map(img => (typeof img === 'string' ? { image_url: img.trim(), is_primary: false } : { image_url: (img.image_url || '').trim(), is_primary: Boolean(img.is_primary) }))
        .filter(img => img.image_url.length > 0)
        .slice(0, 5);

      if (validImages.length > 0) {
        const hasPrimary = validImages.some(img => img.is_primary);
        if (!hasPrimary) {
          validImages[0].is_primary = true;
        }

        for (const img of validImages) {
          await db.query(
            'INSERT INTO resource_images (resource_id, image_url, is_primary) VALUES (?, ?, ?)',
            [resourceId, img.image_url, img.is_primary ? 1 : 0]
          );
        }
      }
    } else if (image_url) {
      await db.query(
        'INSERT INTO resource_images (resource_id, image_url, is_primary) VALUES (?, ?, TRUE)',
        [resourceId, image_url]
      );
    }

    // M14: Asynchronously notify users with items in this category in their wishlist
    notifyWishlistCategoryMatch(resourceId, category_id, title, owner_id).catch(e => {
      console.error('[ResourceController] Error notifying category wishlist users:', e);
    });

    return res.status(201).json({
      success: true,
      message: 'Resource listed successfully.',
      data: {
        id: resourceId,
        title,
        exchange_type,
        price: finalPrice,
        status: 'AVAILABLE'
      }
    });

  } catch (error) {
    console.error('Error creating resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while listing resource.'
    });
  }
};

// 3. Get All Resources (with M12 Advanced Search & Filtering)
const getResources = async (req, res) => {
  try {
    const { 
      category_id, 
      exchange_type, 
      item_condition, 
      condition, 
      status, 
      owner_id, 
      search, 
      min_price, 
      max_price, 
      location, 
      meetup_location, 
      sort, 
      page, 
      limit 
    } = req.query;

    // Pagination limits
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    let parsedLimit = Math.max(parseInt(limit, 10) || 12, 1);
    if (parsedLimit > 50) parsedLimit = 50; // Cap limit at 50
    const offset = (parsedPage - 1) * parsedLimit;

    // Base query components
    let selectSql = `
      SELECT 
        r.id, 
        r.owner_id, 
        r.title, 
        r.description, 
        r.category_id, 
        c.name AS category, 
        r.exchange_type, 
        r.price, 
        r.item_condition, 
        r.meetup_location, 
        r.status, 
        r.created_at, 
        r.updated_at,
        u.name AS owner_name,
        u.trust_score AS owner_trust_score,
        (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.owner_id = u.id
    `;

    let countSql = `
      SELECT COUNT(*) AS total
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.owner_id = u.id
    `;

    const whereClauses = [];
    const queryParams = [];

    // Filter status: if empty, defaults to AVAILABLE. If status = ALL, fetches everything except ARCHIVED.
    if (status) {
      if (status.toUpperCase() === 'ALL') {
        whereClauses.push("r.status != 'ARCHIVED'");
      } else {
        const validStatuses = ['AVAILABLE', 'RESERVED', 'EXCHANGED'];
        if (validStatuses.includes(status.toUpperCase())) {
          whereClauses.push('r.status = ?');
          queryParams.push(status.toUpperCase());
        } else {
          whereClauses.push("r.status = 'AVAILABLE'");
        }
      }
    } else {
      whereClauses.push("r.status = 'AVAILABLE'");
    }

    // Filter Category
    if (category_id) {
      const parsedCat = parseInt(category_id, 10);
      if (!isNaN(parsedCat)) {
        whereClauses.push('r.category_id = ?');
        queryParams.push(parsedCat);
      }
    }

    // Filter Exchange Type
    if (exchange_type) {
      const validTypes = ['SELL', 'BORROW', 'DONATE', 'SWAP'];
      if (validTypes.includes(exchange_type.toUpperCase())) {
        whereClauses.push('r.exchange_type = ?');
        queryParams.push(exchange_type.toUpperCase());
      }
    }

    // Filter Item Condition (support condition or item_condition)
    const rawCondition = item_condition || condition;
    if (rawCondition) {
      const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
      if (validConditions.includes(rawCondition.toUpperCase())) {
        whereClauses.push('r.item_condition = ?');
        queryParams.push(rawCondition.toUpperCase());
      }
    }

    // Filter Owner ID
    if (owner_id) {
      const parsedOwner = parseInt(owner_id, 10);
      if (!isNaN(parsedOwner)) {
        whereClauses.push('r.owner_id = ?');
        queryParams.push(parsedOwner);
      }
    }

    // Filter Search (Case-insensitive partial matching on title and description)
    const trimmedSearch = search && typeof search === 'string' ? search.trim() : '';
    if (trimmedSearch !== '') {
      whereClauses.push('(r.title LIKE ? OR r.description LIKE ?)');
      const searchWildcard = `%${trimmedSearch}%`;
      queryParams.push(searchWildcard, searchWildcard);
    }

    // Filter Price Range (min_price and max_price)
    if (min_price !== undefined && min_price !== null && min_price !== '') {
      const parsedMin = parseFloat(min_price);
      if (!isNaN(parsedMin) && parsedMin >= 0) {
        whereClauses.push('r.price >= ?');
        queryParams.push(parsedMin);
      }
    }

    if (max_price !== undefined && max_price !== null && max_price !== '') {
      const parsedMax = parseFloat(max_price);
      if (!isNaN(parsedMax) && parsedMax >= 0) {
        whereClauses.push('r.price <= ?');
        queryParams.push(parsedMax);
      }
    }

    // Filter Meetup Location (partial matching)
    const rawLocation = location || meetup_location;
    if (rawLocation && typeof rawLocation === 'string' && rawLocation.trim() !== '') {
      whereClauses.push('r.meetup_location LIKE ?');
      queryParams.push(`%${rawLocation.trim()}%`);
    }

    // Combine WHERE clauses
    if (whereClauses.length > 0) {
      const combinedWhere = ' WHERE ' + whereClauses.join(' AND ');
      selectSql += combinedWhere;
      countSql += combinedWhere;
    }

    // Count query executes with where-clause params
    const countQueryParams = [...queryParams];
    const [countRows] = await db.query(countSql, countQueryParams);
    const total = countRows[0].total;

    // Sorting whitelists to protect against SQL injections
    let orderClause = ' ORDER BY r.created_at DESC';
    const selectQueryParams = [...queryParams];

    if (sort) {
      switch (sort.toLowerCase()) {
        case 'latest':
        case 'newest':
          orderClause = ' ORDER BY r.created_at DESC, r.id DESC';
          break;
        case 'oldest':
          orderClause = ' ORDER BY r.created_at ASC, r.id ASC';
          break;
        case 'price_low':
        case 'price_asc':
          orderClause = ' ORDER BY (r.price IS NULL), r.price ASC, r.id DESC';
          break;
        case 'price_high':
        case 'price_desc':
          orderClause = ' ORDER BY (r.price IS NULL), r.price DESC, r.id DESC';
          break;
        case 'trust_score':
        case 'highest_trust':
          orderClause = ' ORDER BY u.trust_score DESC, r.created_at DESC, r.id DESC';
          break;
        case 'relevant':
        case 'relevance':
          if (trimmedSearch !== '') {
            orderClause = ' ORDER BY (CASE WHEN r.title LIKE ? THEN 1 WHEN r.description LIKE ? THEN 2 ELSE 3 END) ASC, r.created_at DESC, r.id DESC';
            const searchWildcard = `%${trimmedSearch}%`;
            selectQueryParams.push(searchWildcard, searchWildcard);
          } else {
            orderClause = ' ORDER BY r.created_at DESC, r.id DESC';
          }
          break;
        case 'title':
          orderClause = ' ORDER BY r.title ASC, r.id DESC';
          break;
        default:
          orderClause = ' ORDER BY r.created_at DESC, r.id DESC';
      }
    } else {
      orderClause = ' ORDER BY r.created_at DESC, r.id DESC';
    }
    selectSql += orderClause;

    // Pagination LIMIT & OFFSET
    selectSql += ' LIMIT ? OFFSET ?';
    selectQueryParams.push(parsedLimit, offset);

    // Execute select query
    const [rows] = await db.query(selectSql, selectQueryParams);

    // Map rows to match output structure
    const resources = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category_id: r.category_id,
      category: r.category,
      exchange_type: r.exchange_type,
      price: r.price !== null ? parseFloat(r.price) : null,
      item_condition: r.item_condition,
      meetup_location: r.meetup_location,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      owner: {
        id: r.owner_id,
        name: r.owner_name,
        trust_score: parseFloat(r.owner_trust_score || 100.00)
      },
      image_url: r.image_url
    }));

    const totalPages = Math.ceil(total / parsedLimit);

    return res.status(200).json({
      success: true,
      data: resources,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching resources:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching resources.'
    });
  }
};

// 4. Get Resource By ID
const getResourceById = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID parameter.'
      });
    }

    // Retrieve resource details
    const [rows] = await db.query(
      `SELECT 
        r.*, 
        c.name AS category, 
        u.name AS owner_name,
        u.email AS owner_email,
        u.bio AS owner_bio,
        u.trust_score AS owner_trust_score,
        u.reputation_score AS owner_reputation_score
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.owner_id = u.id
      WHERE r.id = ?`,
      [resourceId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource listing not found.'
      });
    }

    const resource = rows[0];

    // Retrieve all images
    const [images] = await db.query(
      'SELECT id, image_url, is_primary FROM resource_images WHERE resource_id = ? ORDER BY is_primary DESC, id ASC',
      [resourceId]
    );

    const formattedImages = images.map(img => ({
      id: img.id,
      image_url: img.image_url,
      is_primary: Boolean(img.is_primary)
    }));

    // Format safe structure
    const responseData = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      category_id: resource.category_id,
      category: resource.category,
      exchange_type: resource.exchange_type,
      price: resource.price,
      item_condition: resource.item_condition,
      meetup_location: resource.meetup_location,
      status: resource.status,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      owner: {
        id: resource.owner_id,
        name: resource.owner_name,
        email: resource.owner_email,
        bio: resource.owner_bio,
        trust_score: parseFloat(resource.owner_trust_score || 100.00),
        reputation_score: parseFloat(resource.owner_reputation_score !== undefined && resource.owner_reputation_score !== null ? resource.owner_reputation_score : (resource.owner_trust_score || 100.00))
      },
      images: formattedImages
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching resource details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching resource details.'
    });
  }
};

// 5. Update Resource
const updateResource = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.'
      });
    }

    const userId = req.user.id;

    // Fetch existing resource
    const [resources] = await db.query('SELECT owner_id FROM resources WHERE id = ?', [resourceId]);
    if (!resources || resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    const resource = resources[0];

    // Check ownership
    if (resource.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this resource.'
      });
    }

    let { title, description, category_id, exchange_type, price, item_condition, meetup_location, status, image_url, images } = req.body;

    // Validation
    if (!title || !description || category_id === undefined || !exchange_type || !item_condition || !meetup_location || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required update attributes.'
      });
    }

    title = typeof title === 'string' ? title.trim() : '';
    description = typeof description === 'string' ? description.trim() : '';
    meetup_location = typeof meetup_location === 'string' ? meetup_location.trim() : '';
    image_url = image_url ? image_url.trim() : null;

    if (!title || !description || !meetup_location) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and meetup location cannot be blank.'
      });
    }

    // Validate Exchange Type
    const validExchangeTypes = ['SELL', 'BORROW', 'DONATE', 'SWAP'];
    if (!validExchangeTypes.includes(exchange_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exchange type.'
      });
    }

    // Validate Item Condition
    const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
    if (!validConditions.includes(item_condition.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item condition.'
      });
    }

    // Validate status
    const validStatuses = ['AVAILABLE', 'RESERVED', 'EXCHANGED', 'ARCHIVED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

    // Validate price matching exchange type
    let finalPrice = null;
    if (exchange_type.toUpperCase() === 'SELL') {
      if (price === undefined || price === null || price === '') {
        return res.status(400).json({
          success: false,
          message: 'Price is required for SELL listings.'
        });
      }
      finalPrice = parseFloat(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price cannot be negative.'
        });
      }
    }

    // Verify Category exists
    const [categories] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!categories || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category does not exist.'
      });
    }

    // Update resources row (disallow owner_id or id changes)
    await db.query(
      `UPDATE resources 
      SET title = ?, description = ?, category_id = ?, exchange_type = ?, price = ?, item_condition = ?, meetup_location = ?, status = ?
      WHERE id = ?`,
      [title, description, category_id, exchange_type.toUpperCase(), finalPrice, item_condition.toUpperCase(), meetup_location, status.toUpperCase(), resourceId]
    );

    // Update images: Support both new `images` array and legacy `image_url`
    if (Array.isArray(images)) {
      const validImages = images
        .map(img => (typeof img === 'string' ? { image_url: img.trim(), is_primary: false } : { image_url: (img.image_url || '').trim(), is_primary: Boolean(img.is_primary) }))
        .filter(img => img.image_url.length > 0)
        .slice(0, 5);

      // Fetch existing images to clean up removed local files
      const [existingImgs] = await db.query('SELECT image_url FROM resource_images WHERE resource_id = ?', [resourceId]);
      const newUrls = new Set(validImages.map(img => img.image_url));
      for (const old of existingImgs) {
        if (!newUrls.has(old.image_url)) {
          await deleteImageFile(old.image_url);
        }
      }

      await db.query('DELETE FROM resource_images WHERE resource_id = ?', [resourceId]);

      if (validImages.length > 0) {
        const hasPrimary = validImages.some(img => img.is_primary);
        if (!hasPrimary) {
          validImages[0].is_primary = true;
        }

        for (const img of validImages) {
          await db.query(
            'INSERT INTO resource_images (resource_id, image_url, is_primary) VALUES (?, ?, ?)',
            [resourceId, img.image_url, img.is_primary ? 1 : 0]
          );
        }
      }
    } else if (image_url !== undefined) {
      if (image_url) {
        const [existingImages] = await db.query('SELECT id FROM resource_images WHERE resource_id = ? AND is_primary = TRUE', [resourceId]);
        if (existingImages && existingImages.length > 0) {
          await db.query('UPDATE resource_images SET image_url = ? WHERE id = ?', [image_url, existingImages[0].id]);
        } else {
          await db.query('INSERT INTO resource_images (resource_id, image_url, is_primary) VALUES (?, ?, TRUE)', [resourceId, image_url]);
        }
      } else {
        // If user clears the image, delete primary image
        await db.query('DELETE FROM resource_images WHERE resource_id = ? AND is_primary = TRUE', [resourceId]);
      }
    }

    // M14: Asynchronously notify users who wishlisted this resource of its availability
    if (status.toUpperCase() === 'AVAILABLE') {
      notifyWishlistAvailability(resourceId).catch(e => {
        console.error('[ResourceController] Error notifying wishlist availability:', e);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully.'
    });

  } catch (error) {
    console.error('Error updating resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating resource.'
    });
  }
};

// 6. Delete Resource (Soft Delete via status ARCHIVED)
const deleteResource = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.'
      });
    }

    const userId = req.user.id;

    // Fetch existing resource
    const [resources] = await db.query('SELECT owner_id FROM resources WHERE id = ?', [resourceId]);
    if (!resources || resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    const resource = resources[0];

    // Check ownership
    if (resource.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this resource.'
      });
    }

    // Soft delete (Update status to ARCHIVED)
    await db.query("UPDATE resources SET status = 'ARCHIVED' WHERE id = ?", [resourceId]);

    return res.status(200).json({
      success: true,
      message: 'Resource archived successfully'
    });

  } catch (error) {
    console.error('Error deleting resource:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting resource.'
    });
  }
};

// 7. Upload Resource Images (Temporary/Draft standalone upload)
const uploadResourceImages = async (req, res) => {
  try {
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided.'
      });
    }

    const savedImages = await processAndSaveImages(req.uploadedFiles);

    return res.status(200).json({
      success: true,
      message: `${savedImages.length} image(s) processed and uploaded successfully.`,
      data: savedImages
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing image upload.'
    });
  }
};

// 8. Add Image to Existing Resource Listing
const addResourceImage = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.'
      });
    }

    const userId = req.user.id;

    // Fetch existing resource
    const [resources] = await db.query('SELECT owner_id FROM resources WHERE id = ?', [resourceId]);
    if (!resources || resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (resources[0].owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this resource.'
      });
    }

    // Check current count
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM resource_images WHERE resource_id = ?', [resourceId]);
    const currentCount = countRows[0].total;

    if (currentCount >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum of 5 images allowed per resource.'
      });
    }

    let imagesToAdd = [];

    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      if (currentCount + req.uploadedFiles.length > 5) {
        return res.status(400).json({
          success: false,
          message: `Cannot upload ${req.uploadedFiles.length} images. Resource already has ${currentCount} (max 5).`
        });
      }
      const saved = await processAndSaveImages(req.uploadedFiles);
      imagesToAdd = saved.map(s => s.image_url);
    } else if (req.body.image_url) {
      const url = req.body.image_url.trim();
      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'Image URL cannot be empty.'
        });
      }
      imagesToAdd = [url];
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image file or image_url provided.'
      });
    }

    const inserted = [];
    for (let i = 0; i < imagesToAdd.length; i++) {
      const imgUrl = imagesToAdd[i];
      // If resource currently has 0 images and this is the first image, make it primary
      const isPrimary = (currentCount === 0 && i === 0);
      const [insertRes] = await db.query(
        'INSERT INTO resource_images (resource_id, image_url, is_primary) VALUES (?, ?, ?)',
        [resourceId, imgUrl, isPrimary ? 1 : 0]
      );
      inserted.push({
        id: insertRes.insertId,
        resource_id: resourceId,
        image_url: imgUrl,
        is_primary: isPrimary
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Image(s) added successfully.',
      data: inserted
    });
  } catch (error) {
    console.error('Error adding resource image:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while adding image.'
    });
  }
};

// 9. Set Image as Primary for Resource
const setPrimaryResourceImage = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    if (isNaN(resourceId) || isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID or image ID.'
      });
    }

    const userId = req.user.id;

    // Fetch existing resource
    const [resources] = await db.query('SELECT owner_id FROM resources WHERE id = ?', [resourceId]);
    if (!resources || resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (resources[0].owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this resource.'
      });
    }

    // Verify image belongs to this resource
    const [images] = await db.query('SELECT id FROM resource_images WHERE id = ? AND resource_id = ?', [imageId, resourceId]);
    if (!images || images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found on this resource.'
      });
    }

    // Unset existing primary and set new primary
    await db.query('UPDATE resource_images SET is_primary = FALSE WHERE resource_id = ?', [resourceId]);
    await db.query('UPDATE resource_images SET is_primary = TRUE WHERE id = ? AND resource_id = ?', [imageId, resourceId]);

    return res.status(200).json({
      success: true,
      message: 'Primary image updated successfully.'
    });
  } catch (error) {
    console.error('Error setting primary image:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating primary image.'
    });
  }
};

// 10. Delete Image from Resource Listing
const deleteResourceImage = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    if (isNaN(resourceId) || isNaN(imageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID or image ID.'
      });
    }

    const userId = req.user.id;

    // Fetch existing resource
    const [resources] = await db.query('SELECT owner_id FROM resources WHERE id = ?', [resourceId]);
    if (!resources || resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    if (resources[0].owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this resource.'
      });
    }

    // Verify image belongs to this resource
    const [images] = await db.query('SELECT id, image_url, is_primary FROM resource_images WHERE id = ? AND resource_id = ?', [imageId, resourceId]);
    if (!images || images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found on this resource.'
      });
    }

    const targetImage = images[0];

    // Delete DB record
    await db.query('DELETE FROM resource_images WHERE id = ?', [imageId]);

    // Delete local disk file if present
    if (targetImage.image_url) {
      await deleteImageFile(targetImage.image_url);
    }

    // If deleted image was primary, promote oldest remaining image
    if (targetImage.is_primary) {
      const [remaining] = await db.query('SELECT id FROM resource_images WHERE resource_id = ? ORDER BY id ASC LIMIT 1', [resourceId]);
      if (remaining && remaining.length > 0) {
        await db.query('UPDATE resource_images SET is_primary = TRUE WHERE id = ?', [remaining[0].id]);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting resource image:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting image.'
    });
  }
};

module.exports = {
  getCategories,
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  uploadResourceImages,
  addResourceImage,
  setPrimaryResourceImage,
  deleteResourceImage
};

