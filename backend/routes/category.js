const express = require('express');

const {
    listCategories,
    adminListCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../controllers/category');
const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', listCategories);

router
    .route('/admin/categories')
    .get(isAuthUser, authRoles('admin'), adminListCategories)
    .post(isAuthUser, authRoles('admin'), createCategory);

router
    .route('/admin/categories/:id')
    .put(isAuthUser, authRoles('admin'), updateCategory)
    .delete(isAuthUser, authRoles('admin'), deleteCategory);

module.exports = router;
