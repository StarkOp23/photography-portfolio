// server.js - Express Backend with MongoDB GridFS for File Storage
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();

// ===================== PRODUCTION CORS CONFIGURATION =====================

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
].filter(Boolean);

console.log('🌐 Allowed Origins:', allowedOrigins);
console.log('🔧 Environment:', isProduction ? 'Production' : 'Development');

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (!isProduction) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600
};

app.use(cors(corsOptions));

// ===================== MIDDLEWARE =====================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===================== MONGODB CONNECTION =====================

let gfs, gridFSBucket;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/photographer_portfolio', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('✅ MongoDB Connected');
        
        // Initialize GridFS
        const db = mongoose.connection.db;
        gridFSBucket = new GridFSBucket(db, {
            bucketName: 'uploads'
        });
        gfs = gridFSBucket;
        console.log('✅ GridFS Initialized');
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== SCHEMAS =====================

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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
    mediaUrl: { type: String, required: true }, // This will store GridFS file ID
    tags: [String],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

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

// ===================== FILE UPLOAD WITH MEMORY STORAGE =====================

const storage = multer.memoryStorage(); // Store in memory instead of disk

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

// ===================== GRIDFS HELPER FUNCTIONS =====================

// Upload file to GridFS
async function uploadToGridFS(file) {
    return new Promise((resolve, reject) => {
        const readableStream = Readable.from(file.buffer);
        const uploadStream = gridFSBucket.openUploadStream(file.originalname, {
            contentType: file.mimetype,
            metadata: {
                originalname: file.originalname,
                encoding: file.encoding,
                mimetype: file.mimetype,
                size: file.size
            }
        });

        readableStream.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve(uploadStream.id.toString());
            });
    });
}

// Delete file from GridFS
async function deleteFromGridFS(fileId) {
    try {
        await gridFSBucket.delete(new mongoose.Types.ObjectId(fileId));
        console.log(`✅ Deleted file: ${fileId}`);
    } catch (error) {
        console.error(`❌ Error deleting file: ${fileId}`, error);
    }
}

// ===================== SERVE FILES FROM GRIDFS =====================

app.get('/api/file/:fileId', async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        
        // Get file info
        const files = await gridFSBucket.find({ _id: fileId }).toArray();
        
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = files[0];
        
        // Set proper headers
        res.set('Content-Type', file.contentType);
        res.set('Content-Length', file.length);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Stream file to response
        const downloadStream = gridFSBucket.openDownloadStream(fileId);
        downloadStream.pipe(res);
        
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ error: 'Error retrieving file' });
    }
});

// ===================== MIDDLEWARE =====================

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

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ===================== AUTH ROUTES =====================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userCount = await User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'user';

        const user = new User({
            username,
            email,
            password: hashedPassword,
            role
        });

        await user.save();

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

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

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

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ===================== POST ROUTES =====================

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

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.views += 1;
        await post.save();

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/posts', authenticateToken, isAdmin, upload.single('media'), async (req, res) => {
    try {
        let mediaUrl = req.body.mediaUrl;

        // If file uploaded, save to GridFS
        if (req.file) {
            const fileId = await uploadToGridFS(req.file);
            mediaUrl = `/api/file/${fileId}`;
            console.log(`✅ File uploaded to GridFS: ${fileId}`);
        }

        const postData = {
            ...req.body,
            mediaUrl: mediaUrl,
            tags: req.body.tags ? JSON.parse(req.body.tags) : []
        };

        const post = new Post(postData);
        await post.save();

        res.status(201).json({ message: 'Post created successfully', post });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/posts/:id', authenticateToken, isAdmin, upload.single('media'), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const updateData = { ...req.body, updatedAt: Date.now() };

        // If new file uploaded
        if (req.file) {
            // Delete old file from GridFS
            if (post.mediaUrl && post.mediaUrl.startsWith('/api/file/')) {
                const oldFileId = post.mediaUrl.split('/').pop();
                await deleteFromGridFS(oldFileId);
            }

            // Upload new file
            const fileId = await uploadToGridFS(req.file);
            updateData.mediaUrl = `/api/file/${fileId}`;
            console.log(`✅ File updated in GridFS: ${fileId}`);
        }

        if (req.body.tags && typeof req.body.tags === 'string') {
            updateData.tags = JSON.parse(req.body.tags);
        }

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({ message: 'Post updated successfully', post: updatedPost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/posts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Delete file from GridFS
        if (post.mediaUrl && post.mediaUrl.startsWith('/api/file/')) {
            const fileId = post.mediaUrl.split('/').pop();
            await deleteFromGridFS(fileId);
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/gear', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl;

        if (req.file) {
            const fileId = await uploadToGridFS(req.file);
            imageUrl = `/api/file/${fileId}`;
        }

        const gearData = {
            ...req.body,
            imageUrl: imageUrl,
            specs: req.body.specs ? JSON.parse(req.body.specs) : {}
        };

        const gear = new Gear(gearData);
        await gear.save();

        res.status(201).json({ message: 'Gear added successfully', gear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gear/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const gear = await Gear.findById(req.params.id);
        if (!gear) {
            return res.status(404).json({ error: 'Gear not found' });
        }

        const updateData = { ...req.body };

        if (req.file) {
            if (gear.imageUrl && gear.imageUrl.startsWith('/api/file/')) {
                const oldFileId = gear.imageUrl.split('/').pop();
                await deleteFromGridFS(oldFileId);
            }

            const fileId = await uploadToGridFS(req.file);
            updateData.imageUrl = `/api/file/${fileId}`;
        }

        if (req.body.specs && typeof req.body.specs === 'string') {
            updateData.specs = JSON.parse(req.body.specs);
        }

        const updatedGear = await Gear.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.json({ message: 'Gear updated successfully', gear: updatedGear });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gear/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const gear = await Gear.findById(req.params.id);
        if (gear && gear.imageUrl && gear.imageUrl.startsWith('/api/file/')) {
            const fileId = gear.imageUrl.split('/').pop();
            await deleteFromGridFS(fileId);
        }

        await Gear.findByIdAndDelete(req.params.id);
        res.json({ message: 'Gear deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================== CONTACT ROUTES =====================

app.post('/api/contact', async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contact', authenticateToken, isAdmin, async (req, res) => {
    try {
        const contacts = await Contact.find().sort('-createdAt');
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/upload', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileId = await uploadToGridFS(req.file);

        res.json({
            message: 'File uploaded successfully',
            url: `/api/file/${fileId}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'Not set',
        gridfs: gfs ? 'Connected' : 'Not initialized'
    });
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
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
    console.log(`💾 File Storage: MongoDB GridFS`);
});

module.exports = app;