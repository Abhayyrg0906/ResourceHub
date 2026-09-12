const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

router.get('/campus', locationController.getCampusLocations);
router.get('/search', locationController.searchLocations);
router.get('/', locationController.getCampusLocations);

module.exports = router;
