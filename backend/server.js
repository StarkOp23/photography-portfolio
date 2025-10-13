// server.js - Express Backend with MongoDB
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/photographer_portfolio', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== SCHEMAS =====================

// User Schema (for admin authentication)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Post Schema
const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['photo', 'video'], default: 'photo' },
    category: { type: String, required: true },
    story: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String },
    camera: { type: String },
    lens: { type: String },
    iso: { type: String },
    aperture: { type: String },
    shutterSpeed: { type: String },
    mediaUrl: { type: String, required: true },
    tags: [String],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Gear Schema
const gearSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['camera', 'lens', 'accessory'], required: true },
    brand: { type: String },
    model: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    specs: mongoose.Schema.Types.Mixed,
    purchaseDate: { type: Date },
    inUse: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Gear = mongoose.model('Gear', gearSchema);

// Contact Form Schema
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String },
    message: { type: String, required: true },
    phone: { type: String },
    projectType: { type: String },
    status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
    createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// ===================== FILE UPLOAD =====================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ===================== MIDDLEWARE =====================

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin check middleware
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ===================== AUTH ROUTES =====================

// Register (first user becomes admin)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if this is the first user (make them admin)
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ===================== POST ROUTES =====================

// Get all posts (with filtering and pagination)
app.get('/api/posts', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 12, sort = '-createdAt' } = req.query;

        const query = {};
        if (category && category !== 'all') {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { story: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const posts = await Post.find(query)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Post.countDocuments(query);

        res.json({
            posts,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single post by ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Increment view count
        post.views += 1;
        await post.save();

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new post (admin only)
app.post('/api/posts', authenticateToken, isAdmin, upload.single('media'), async (req, res) => {
    try {
        const postData = {
            ...req.body,
            mediaUrl: req.file ? `/uploads/${req.file.filename}` : req.body.mediaUrl,
            tags: req.body.tags ? JSON.parse(req.body.tags) : []
        };

        const post = new Post(postData);
        await post.save();

        res.status(201).json({ message: 'Post created successfully', post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update post (admin only)
app.put('/api/posts/:id', authenticateToken, isAdmin, upload.single('media'), async (req, res) => {
    try {
        const updateData = { ...req.body, updatedAt: Date.now() };

        if (req.file) {
            updateData.mediaUrl = `/uploads/${req.file.filename}`;
        }

        if (req.body.tags && typeof req.body.tags === 'string') {
            updateData.tags = JSON.parse(req.body.tags);
        }

        const post = await Post.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ message: 'Post updated successfully', post });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete post (admin only)
app.delete('/api/posts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Delete associated file
        if (post.mediaUrl && post.mediaUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, post.mediaUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like post
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.likes += 1;
        await post.save();

        res.json({ likes: post.likes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================== GEAR ROUTES =====================

// Get all gear
app.get('/api/gear', async (req, res) => {
    try {
        const { type } = req.query;
        const query = type ? { type } : {};
        const gear = await Gear.find(query).sort('type name');
        res.json(gear);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create gear (admin only)
app.post('/api/gear', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const gearData = {
            ...req.body,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl,
            specs: req.body.specs ? JSON.parse(req.body.specs) : {}
        };

        const gear = new Gear(gearData);
        await gear.save();

        res.status(201).json({ message: 'Gear added successfully', gear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update gear (admin only)
app.put('/api/gear/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }

        if (req.body.specs && typeof req.body.specs === 'string') {
            updateData.specs = JSON.parse(req.body.specs);
        }

        const gear = await Gear.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!gear) {
            return res.status(404).json({ error: 'Gear not found' });
        }

        res.json({ message: 'Gear updated successfully', gear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete gear (admin only)
app.delete('/api/gear/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await Gear.findByIdAndDelete(req.params.id);
        res.json({ message: 'Gear deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================== CONTACT ROUTES =====================

// Submit contact form
app.post('/api/contact', async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all contacts (admin only)
app.get('/api/contact', authenticateToken, isAdmin, async (req, res) => {
    try {
        const contacts = await Contact.find().sort('-createdAt');
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update contact status (admin only)
app.put('/api/contact/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================== STATS ROUTES =====================

// Get dashboard statistics (admin only)
app.get('/api/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalPosts = await Post.countDocuments();
        const totalViews = await Post.aggregate([
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        const totalLikes = await Post.aggregate([
            { $group: { _id: null, total: { $sum: '$likes' } } }
        ]);
        const totalMessages = await Contact.countDocuments();
        const unreadMessages = await Contact.countDocuments({ status: 'new' });

        const postsByCategory = await Post.aggregate([
            { $group: { _id: '$category', count: { $count: {} } } }
        ]);

        const recentPosts = await Post.find().sort('-createdAt').limit(5);
        const topPosts = await Post.find().sort('-views').limit(5);

        res.json({
            totalPosts,
            totalViews: totalViews[0]?.total || 0,
            totalLikes: totalLikes[0]?.total || 0,
            totalMessages,
            unreadMessages,
            postsByCategory,
            recentPosts,
            topPosts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================== UTILITY ROUTES =====================

// Upload single file
app.post('/api/upload', authenticateToken, isAdmin, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({
            message: 'File uploaded successfully',
            url: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// ===================== ERROR HANDLING =====================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// ===================== START SERVER =====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
});

module.exports = app;