const Banner = require('../models/banner');
const generateId = require('../utils/generateId');

// GET /banners — public, used by the home screen promo card
exports.getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: 1 });

        res.status(200).json({
            success: true,
            banners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch banners',
            error: error.message
        });
    }
};

// POST /admin/banner — admin only
exports.createBanner = async (req, res) => {
    try {
        const { title, subtitle, description, buttonText, imageUrl, order } = req.body;

        const banner = await Banner.create({
            _id: generateId(),
            title,
            subtitle,
            description,
            buttonText: buttonText || 'Shop Now',
            image: { url: imageUrl || null },
            order: order || 0
        });

        res.status(201).json({ success: true, banner });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create banner',
            error: error.message
        });
    }
};

// GET /admin/banners — admin only, includes inactive banners
exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
        res.status(200).json({ success: true, banners });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch banners',
            error: error.message
        });
    }
};

// PUT /admin/banner/:id — admin only
exports.updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }

        const { title, subtitle, description, buttonText, imageUrl, active, order } = req.body;

        if (title !== undefined) banner.title = title;
        if (subtitle !== undefined) banner.subtitle = subtitle;
        if (description !== undefined) banner.description = description;
        if (buttonText !== undefined) banner.buttonText = buttonText;
        if (imageUrl !== undefined) banner.image = { url: imageUrl };
        if (active !== undefined) banner.active = active;
        if (order !== undefined) banner.order = order;

        await banner.save();

        res.status(200).json({ success: true, banner });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update banner',
            error: error.message
        });
    }
};

// DELETE /admin/banner/:id — admin only
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete banner',
            error: error.message
        });
    }
};
