// seed.js - Populate database with sample data for testing
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/photographer_portfolio', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected for seeding'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define Schemas (same as server.js)
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: String,
    createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    title: String,
    type: String,
    category: String,
    story: String,
    location: String,
    date: Date,
    time: String,
    camera: String,
    lens: String,
    iso: String,
    aperture: String,
    shutterSpeed: String,
    mediaUrl: String,
    tags: [String],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const gearSchema = new mongoose.Schema({
    name: String,
    type: String,
    brand: String,
    model: String,
    description: String,
    imageUrl: String,
    specs: mongoose.Schema.Types.Mixed,
    inUse: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Gear = mongoose.model('Gear', gearSchema);

// Sample Data
const sampleUsers = [
    {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
    },
    {
        username: 'Soumyadeep',
        email: 'info.sanju2000@gmail.com',
        password: 'Sanju@23',
        role: 'admin'
    }

];

const samplePosts = [
    {
        title: 'Golden Hour in Santorini',
        type: 'photo',
        category: 'landscape',
        story: 'The magic hour painted the white buildings in warm amber light. I waited three evenings for the perfect atmospheric conditions, and this moment made every second worth it. The way the sun dipped behind the caldera, casting long shadows across the iconic blue domes, was absolutely mesmerizing.',
        location: 'Santorini, Greece',
        date: new Date('2024-08-15'),
        time: '19:45',
        camera: 'Sony A7R IV',
        lens: '24-70mm f/2.8 GM',
        iso: '100',
        aperture: 'f/8',
        shutterSpeed: '1/125',
        mediaUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
        tags: ['sunset', 'architecture', 'travel', 'greece'],
        views: 245,
        likes: 42,
        featured: true
    },
    {
        title: 'Wedding Vows',
        type: 'photo',
        category: 'events',
        story: 'The bride\'s eyes welled up as her father walked her down the aisle. This unrehearsed moment of pure emotion is why I love what I do. No amount of planning can create genuine feelings like this - you just have to be ready to capture them when they happen.',
        location: 'Villa Rosa, Tuscany, Italy',
        date: new Date('2024-06-20'),
        time: '16:30',
        camera: 'Canon EOS R5',
        lens: '85mm f/1.2',
        iso: '400',
        aperture: 'f/1.8',
        shutterSpeed: '1/200',
        mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
        tags: ['wedding', 'emotion', 'documentary', 'italy'],
        views: 189,
        likes: 67
    },
    {
        title: 'Urban Stories',
        type: 'video',
        category: 'commercial',
        story: 'A 48-hour journey through Tokyo\'s hidden alleys, capturing the soul of the city through the eyes of local artisans. From ramen masters to traditional craftsmen, each frame tells a story of dedication and passion.',
        location: 'Tokyo, Japan',
        date: new Date('2024-09-10'),
        time: '22:00',
        camera: 'Sony FX3',
        lens: '35mm f/1.4',
        iso: '3200',
        aperture: 'f/2',
        shutterSpeed: '1/50',
        mediaUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
        tags: ['cinematic', 'street', 'documentary', 'japan'],
        views: 512,
        likes: 94,
        featured: true
    },
    {
        title: 'Mountain Solitude',
        type: 'photo',
        category: 'landscape',
        story: 'Dawn breaks over the Dolomites. The silence at 2,800 meters is profound - only the wind and your breathing. I hiked 3 hours in darkness to capture this moment as the first rays of sun painted the peaks gold.',
        location: 'Dolomites, Italy',
        date: new Date('2024-07-05'),
        time: '05:15',
        camera: 'Sony A7R IV',
        lens: '16-35mm f/2.8',
        iso: '64',
        aperture: 'f/11',
        shutterSpeed: '1/60',
        mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['mountains', 'sunrise', 'adventure', 'nature'],
        views: 328,
        likes: 78
    },
    {
        title: 'Street Musician',
        type: 'photo',
        category: 'portraits',
        story: 'Met this incredible saxophonist in the Paris metro. His name is Marcel, and he\'s been playing here for 15 years. The way the afternoon light streamed through the station entrance created this perfect rim light on his weathered face.',
        location: 'Paris Metro, France',
        date: new Date('2024-05-12'),
        time: '14:20',
        camera: 'Leica M10',
        lens: '50mm f/1.4 Summilux',
        iso: '800',
        aperture: 'f/2',
        shutterSpeed: '1/125',
        mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        tags: ['portrait', 'street', 'music', 'paris'],
        views: 156,
        likes: 45
    },
    {
        title: 'Behind the Scenes: Fashion Shoot',
        type: 'photo',
        category: 'bts',
        story: 'Capturing the chaos and creativity of a high-fashion shoot. This is what happens when 20 people work together to create one perfect image. The energy on set was electric!',
        location: 'Studio 5, New York',
        date: new Date('2024-08-22'),
        time: '11:00',
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        iso: '1600',
        aperture: 'f/4',
        shutterSpeed: '1/160',
        mediaUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
        tags: ['bts', 'fashion', 'studio', 'team'],
        views: 203,
        likes: 51
    },
    {
        title: 'Corporate Headshots',
        type: 'photo',
        category: 'commercial',
        story: 'Professional headshots for a tech startup. The challenge was making 50 employees feel comfortable and natural in front of the camera. My approach: conversation first, photos second.',
        location: 'Tech Hub, San Francisco',
        date: new Date('2024-09-15'),
        time: '09:30',
        camera: 'Canon EOS R5',
        lens: '85mm f/1.2',
        iso: '200',
        aperture: 'f/2.8',
        shutterSpeed: '1/200',
        mediaUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800',
        tags: ['corporate', 'headshot', 'business', 'portrait'],
        views: 287,
        likes: 34
    },
    {
        title: 'Wild Coast',
        type: 'photo',
        category: 'landscape',
        story: 'The rugged coastline of Big Sur. I love the drama of this place - the way the cliffs drop into the Pacific, the power of the waves crashing below. Shot with a long exposure to smooth the water and emphasize the movement.',
        location: 'Big Sur, California',
        date: new Date('2024-04-18'),
        time: '17:30',
        camera: 'Sony A7R IV',
        lens: '24-70mm f/2.8',
        iso: '50',
        aperture: 'f/16',
        shutterSpeed: '30s',
        mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['coast', 'ocean', 'long-exposure', 'nature'],
        views: 412,
        likes: 89
    }
];

const sampleGear = [
    {
        name: 'Sony A7R IV',
        type: 'camera',
        brand: 'Sony',
        model: 'A7R IV',
        description: 'My primary camera for high-resolution landscape and commercial work. The 61MP sensor delivers incredible detail.',
        specs: {
            megapixels: '61MP',
            sensor: 'Full Frame',
            videoResolution: '4K',
            iso: '100-32000'
        },
        inUse: true
    },
    {
        name: 'Canon EOS R5',
        type: 'camera',
        brand: 'Canon',
        model: 'EOS R5',
        description: 'Perfect for fast-paced wedding and event photography. The autofocus is simply unbeatable.',
        specs: {
            megapixels: '45MP',
            sensor: 'Full Frame',
            videoResolution: '8K',
            iso: '100-51200'
        },
        inUse: true
    },
    {
        name: 'Sony FX3',
        type: 'camera',
        brand: 'Sony',
        model: 'FX3',
        description: 'Cinema camera body for professional video work. Compact yet powerful.',
        specs: {
            sensor: 'Full Frame',
            videoResolution: '4K 120fps',
            iso: '80-102400',
            codec: '10-bit 4:2:2'
        },
        inUse: true
    },
    {
        name: 'Leica M10',
        type: 'camera',
        brand: 'Leica',
        model: 'M10',
        description: 'For street photography and personal projects. The rangefinder focusing makes you see differently.',
        specs: {
            megapixels: '24MP',
            sensor: 'Full Frame',
            type: 'Rangefinder',
            iso: '100-50000'
        },
        inUse: true
    },
    {
        name: 'Sony 24-70mm f/2.8 GM',
        type: 'lens',
        brand: 'Sony',
        model: '24-70mm f/2.8 GM',
        description: 'The workhorse lens. If I could only have one lens, this would be it.',
        specs: {
            focalLength: '24-70mm',
            aperture: 'f/2.8',
            mount: 'Sony E',
            weight: '886g'
        },
        inUse: true
    },
    {
        name: 'Canon RF 85mm f/1.2',
        type: 'lens',
        brand: 'Canon',
        model: 'RF 85mm f/1.2',
        description: 'Portrait perfection. The bokeh is creamy smooth and the sharpness is incredible.',
        specs: {
            focalLength: '85mm',
            aperture: 'f/1.2',
            mount: 'Canon RF',
            weight: '1195g'
        },
        inUse: true
    },
    {
        name: 'Sony FE 35mm f/1.4',
        type: 'lens',
        brand: 'Sony',
        model: 'FE 35mm f/1.4 GM',
        description: 'My go-to for environmental storytelling and street photography.',
        specs: {
            focalLength: '35mm',
            aperture: 'f/1.4',
            mount: 'Sony E',
            weight: '524g'
        },
        inUse: true
    },
    {
        name: 'Sony 70-200mm f/2.8',
        type: 'lens',
        brand: 'Sony',
        model: '70-200mm f/2.8 GM II',
        description: 'Essential for events, weddings, and wildlife. The reach and compression are invaluable.',
        specs: {
            focalLength: '70-200mm',
            aperture: 'f/2.8',
            mount: 'Sony E',
            weight: '1045g'
        },
        inUse: true
    },
    {
        name: 'Leica Summilux 50mm f/1.4',
        type: 'lens',
        brand: 'Leica',
        model: 'Summilux-M 50mm f/1.4',
        description: 'Classic Leica glass. The rendering is unique and the build quality is exceptional.',
        specs: {
            focalLength: '50mm',
            aperture: 'f/1.4',
            mount: 'Leica M',
            weight: '335g'
        },
        inUse: true
    },
    {
        name: 'DJI Ronin RS3',
        type: 'accessory',
        brand: 'DJI',
        model: 'RS3',
        description: 'Gimbal stabilizer for smooth cinematic video work.',
        specs: {
            payload: '3kg',
            battery: '12 hours',
            modes: '3-axis'
        },
        inUse: true
    },
    {
        name: 'Profoto B10',
        type: 'accessory',
        brand: 'Profoto',
        model: 'B10',
        description: 'Portable flash for on-location work. Powerful and battery-powered.',
        specs: {
            power: '250Ws',
            battery: '400 flashes',
            weight: '1.5kg'
        },
        inUse: true
    }
];

// Seed Function
async function seedDatabase() {
    try {
        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Post.deleteMany({});
        await Gear.deleteMany({});
        console.log('✅ Data cleared');

        // Create users with hashed passwords
        console.log('👤 Creating users...');
        for (let userData of sampleUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            await User.create({ ...userData, password: hashedPassword });
        }
        console.log('✅ Users created');

        // Create posts
        console.log('📸 Creating posts...');
        await Post.insertMany(samplePosts);
        console.log('✅ Posts created');

        // Create gear
        console.log('📷 Creating gear...');
        await Gear.insertMany(sampleGear);
        console.log('✅ Gear created');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Users: ${sampleUsers.length}`);
        console.log(`   Posts: ${samplePosts.length}`);
        console.log(`   Gear: ${sampleGear.length}`);
        console.log('\n🔐 Login credentials:');
        console.log('   Email: admin@example.com');
        console.log('   Password: admin123');
        console.log('\n⚠️  Remember to change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run seed
seedDatabase();