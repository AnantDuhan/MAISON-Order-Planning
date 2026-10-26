/**
 * Admin AI tools. Everything here returns suggestions only; the admin reviews
 * them in the form and saves through the normal product endpoints.
 */
const express = require('express');
const multer = require('multer');

const { isAuthUser, authRoles } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { requireFeature } = require('../services/featureFlags');
const ai = require('../services/aiService');
const categoryService = require('../services/categoryService');

const router = express.Router();

// Photos go straight to the model from memory; nothing is stored in S3 until
// the admin actually creates the product.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (req, file, cb) =>
        ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)
            ? cb(null, true)
            : cb(Object.assign(new Error('Photos must be PNG, JPEG or WebP'), { statusCode: 400 })),
});

const acceptPhotos = (req, res, next) =>
    upload.array('photos', 4)(req, res, err => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 5 MB'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Send at most 4 photos'
            : err.message;
        res.status(400).json({ success: false, message });
    });

/**
 * POST /api/v1/admin/ai/product-draft
 * multipart: photos (1-4), category?, notes?
 */
router.post(
    '/admin/ai/product-draft',
    isAuthUser,
    authRoles('admin'),
    requireFeature('aiProductDrafts'),
    aiLimiter,
    acceptPhotos,
    async (req, res) => {
        try {
            const draft = await ai.draftProductListing({
                images: req.files,
                categories: await categoryService.assignableNames(),
                category: req.body.category,
                notes: req.body.notes,
            });
            res.locals.audit = { summary: `AI drafted listing "${draft.name}"` };
            res.status(200).json({ success: true, draft });
        } catch (error) {
            const status = error instanceof ai.AiError ? error.statusCode : 500;
            res.status(status).json({
                success: false,
                message: status === 500 ? 'Could not draft this listing' : error.message,
            });
        }
    }
);

module.exports = router;
