const express = require('express');
const {
    searchProductsController,
    autocompleteController,
} = require('../controllers/search');

const router = express.Router();

router.route('/search').get(searchProductsController);
router.route('/products/autocomplete').get(autocompleteController);

module.exports = router;
