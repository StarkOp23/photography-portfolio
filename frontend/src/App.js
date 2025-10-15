// src/App.js - Updated with Gear Management, Dashboard, and Contacts
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Animation variants (keep existing variants)

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};


function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [postForm, setPostForm] = useState({
    title: '', type: 'photo', category: 'portraits', story: '', location: '',
    date: '', time: '', camera: '', lens: '', iso: '', aperture: '', shutterSpeed: '', tags: []
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '', email: '', subject: '', message: '', phone: '', projectType: ''
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New states for additional features
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showGearModal, setShowGearModal] = useState(false);
  const [gearForm, setGearForm] = useState({
    name: '', type: 'camera', brand: '', model: '', description: '', specs: {}
  });
  const [gearFile, setGearFile] = useState(null);
  const [gearPreview, setGearPreview] = useState(null);
  const [gearFilter, setGearFilter] = useState('all');

  const categories = [
    { id: 'all', label: 'All Work' },
    { id: 'portraits', label: 'Portraits' },
    { id: 'landscape', label: 'Landscape' },
    { id: 'events', label: 'Events' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'bts', label: 'Behind the Scenes' }
  ];

  const gearTypes = [
    { id: 'all', label: 'All Gear' },
    { id: 'camera', label: 'Cameras' },
    { id: 'lens', label: 'Lenses' },
    { id: 'lighting', label: 'Lighting' },
    { id: 'accessory', label: 'Accessories' },
    { id: 'tripod', label: 'Tripods' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) verifyToken();
  }, []);

  useEffect(() => {
    fetchPosts();
    if (activeSection === 'gear') fetchGear();
    if (activeSection === 'dashboard' && user?.role === 'admin') fetchStats();
    if (activeSection === 'contacts' && user?.role === 'admin') fetchContacts();
  }, [filterCategory, searchQuery, currentPage, activeSection, gearFilter]);

  // Close mobile menu when changing sections
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeSection]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.vintage-nav-container')) {
        setIsMobileMenuOpen(false);
      }
      if (showUserMenu && !event.target.closest('.vintage-user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileMenuOpen, showUserMenu]);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, authForm);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', username: '' });
      setIsMobileMenuOpen(false);
    } catch (error) {
      alert(error.response?.data?.error || `${authMode} failed`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts', {
        params: { category: filterCategory, search: searchQuery, page: currentPage, limit: 12 }
      });
      setPosts(response.data.posts);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGear = async () => {
    try {
      const params = gearFilter !== 'all' ? { type: gearFilter } : {};
      const response = await api.get('/gear', { params });
      setGear(response.data);
    } catch (error) {
      console.error('Error fetching gear:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contact');
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleGearFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGearFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setGearPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGear = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(gearForm).forEach(key => {
        if (key === 'specs') {
          formData.append(key, JSON.stringify(gearForm[key]));
        } else if (gearForm[key]) {
          formData.append(key, gearForm[key]);
        }
      });
      if (gearFile) formData.append('image', gearFile);

      if (gearForm._id) {
        await api.put(`/gear/${gearForm._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/gear', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowGearModal(false);
      resetGearForm();
      fetchGear();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save gear');
    }
  };

  const handleEditGear = (gearItem) => {
    setGearForm({ ...gearItem, _id: gearItem._id });
    if (gearItem.imageUrl) {
      setGearPreview(API_URL.replace('/api', '') + gearItem.imageUrl);
    }
    setShowGearModal(true);
  };

  const handleDeleteGear = async (id) => {
    if (!window.confirm('Delete this gear item?')) return;
    try {
      await api.delete(`/gear/${id}`);
      fetchGear();
    } catch (error) {
      alert('Failed to delete gear item');
    }
  };

  const resetGearForm = () => {
    setGearForm({
      name: '', type: 'camera', brand: '', model: '', description: '', specs: {}
    });
    setGearFile(null);
    setGearPreview(null);
  };

  const updateContactStatus = async (id, status) => {
    try {
      await api.put(`/contact/${id}`, { status });
      fetchContacts();
    } catch (error) {
      alert('Failed to update contact status');
    }
  };

  // ... keep existing functions like handleFileChange, handleCreatePost, etc.

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(postForm).forEach(key => {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(postForm[key]));
        } else if (postForm[key]) {
          formData.append(key, postForm[key]);
        }
      });
      if (mediaFile) formData.append('media', mediaFile);

      if (postForm._id) {
        await api.put(`/posts/${postForm._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setShowUploadModal(false);
      resetPostForm();
      fetchPosts();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save post');
    }
  };

  const handleEditPost = (post) => {
    setPostForm({ ...post, _id: post._id });
    setMediaPreview(API_URL.replace('/api', '') + post.mediaUrl);
    setShowUploadModal(true);
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      fetchPosts();
    } catch (error) {
      alert('Failed to delete post');
    }
  };

  const handleLikePost = async (id) => {
    try {
      await api.post(`/posts/${id}/like`);
      fetchPosts();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contact', contactForm);
      setContactForm({ name: '', email: '', subject: '', message: '', phone: '', projectType: '' });
    } catch (error) {
      alert('Failed to send message');
    }
  };

  const resetPostForm = () => {
    setPostForm({
      title: '', type: 'photo', category: 'portraits', story: '', location: '',
      date: '', time: '', camera: '', lens: '', iso: '', aperture: '', shutterSpeed: '', tags: []
    });
    setMediaFile(null);
    setMediaPreview(null);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  return (
    <div className="vintage-app">
      {/* Navigation */}
      <motion.nav
        className="vintage-navbar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="vintage-nav-container">
          <motion.div
            className="vintage-nav-brand"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <span className="vintage-camera-icon">
              <img src="/camera - Copy.png" alt="Camera Icon" />
            </span>
            <h1 className="vintage-brand-title">Artsy Lens</h1>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <button
            className={`vintage-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navigation Menu */}
          <div className={`vintage-nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            {['home', 'about', 'gear', 'contact'].map((section) => (
              <motion.button
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`vintage-nav-link ${activeSection === section ? 'active' : ''}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </motion.button>
            ))}
            {user ? (
              <div className="vintage-user-menu-container">
                <motion.button
                  onClick={toggleUserMenu}
                  className="vintage-user-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  👤 {user.username} ▼
                </motion.button>
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      className="vintage-user-dropdown"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {user.role === 'admin' && (
                        <>
                          <motion.button
                            onClick={() => handleSectionChange('dashboard')}
                            className="vintage-dropdown-item"
                            whileHover={{ scale: 1.02, x: 5 }}
                          >
                            📊 Dashboard
                          </motion.button>
                          <motion.button
                            onClick={() => handleSectionChange('contacts')}
                            className="vintage-dropdown-item"
                            whileHover={{ scale: 1.02, x: 5 }}
                          >
                            📨 Messages ({stats?.unreadMessages || 0})
                          </motion.button>
                        </>
                      )}
                      <motion.button
                        onClick={handleLogout}
                        className="vintage-dropdown-item"
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        🚪 Logout
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                onClick={() => {
                  setShowAuthModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="vintage-btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="vintage-main">
        <AnimatePresence mode="wait">
          {/* HOME SECTION - Keep existing home section */}


          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {/* Hero Section */}
              <motion.div
                className="vintage-hero"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="vintage-hero-content"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                >
                  <h2 className="vintage-hero-title">Capturing Moments</h2>
                  <p className="vintage-hero-subtitle">Every frame tells a story. Every story deserves to be told.</p>
                </motion.div>
              </motion.div>

              {/* Controls */}
              <motion.div
                className="vintage-controls"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div className="vintage-filter-container">
                  {categories.map(cat => (
                    <motion.button
                      key={cat.id}
                      onClick={() => { setFilterCategory(cat.id); setCurrentPage(1); }}
                      className={`vintage-filter-btn ${filterCategory === cat.id ? 'active' : ''}`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {cat.label}
                    </motion.button>
                  ))}
                </div>
                <div className="vintage-action-container">
                  <motion.input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="vintage-search-input"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  />
                  {user?.role === 'admin' && (
                    <motion.button
                      onClick={() => { resetPostForm(); setShowUploadModal(true); }}
                      className="vintage-btn-primary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ➕ New Post
                    </motion.button>
                  )}
                  <div className="vintage-view-toggle">
                    <motion.button
                      onClick={() => setViewMode('grid')}
                      className={`vintage-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ⊞
                    </motion.button>
                    <motion.button
                      onClick={() => setViewMode('list')}
                      className={`vintage-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ☰
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Posts Grid */}
              {loading ? (
                <motion.div
                  className="vintage-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="vintage-spinner"
                  />
                  Loading...
                </motion.div>
              ) : (
                <>
                  <motion.div
                    className={viewMode === 'grid' ? 'vintage-posts-grid' : 'vintage-posts-list'}
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {posts.map((post, index) => (
                      <motion.div
                        key={post._id}
                        className="vintage-post-card"
                        onClick={() => setSelectedPost(post)}
                        variants={fadeInUp}
                        whileHover={{
                          scale: 1.03,
                          y: -8
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="vintage-post-image-container">
                          <motion.img
                            src={API_URL.replace('/api', '') + post.mediaUrl}
                            alt={post.title}
                            className="vintage-post-image"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.4 }}
                          />
                          {post.type === 'video' && (
                            <motion.span
                              className="vintage-video-icon"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              🎥
                            </motion.span>
                          )}
                          <motion.div
                            className="vintage-post-overlay"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <p className="vintage-overlay-location">📍 {post.location}</p>
                            <p className="vintage-overlay-date">{new Date(post.date).toLocaleDateString()}</p>
                          </motion.div>
                        </div>
                        <div className="vintage-post-content">
                          <div className="vintage-post-header">
                            <h3 className="vintage-post-title">{post.title}</h3>
                            {user?.role === 'admin' && (
                              <motion.div
                                className="vintage-post-actions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                              >
                                <motion.button
                                  onClick={(e) => { e.stopPropagation(); handleEditPost(post); }}
                                  className="vintage-icon-btn"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  ✏️
                                </motion.button>
                                <motion.button
                                  onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                  className="vintage-icon-btn"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  🗑️
                                </motion.button>
                              </motion.div>
                            )}
                          </div>
                          <p className="vintage-post-story">{post.story.substring(0, 100)}...</p>
                          <div className="vintage-post-meta">
                            <span>📷 {post.camera}</span>
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              ❤️ {post.likes}
                            </motion.span>
                            <span>👁️ {post.views}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <motion.div
                      className="vintage-pagination"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="vintage-pagination-btn"
                        whileHover={{ scale: currentPage !== 1 ? 1.05 : 1 }}
                        whileTap={{ scale: currentPage !== 1 ? 0.95 : 1 }}
                      >
                        ← Previous
                      </motion.button>
                      <span className="vintage-page-info">Page {currentPage} of {totalPages}</span>
                      <motion.button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="vintage-pagination-btn"
                        whileHover={{ scale: currentPage !== totalPages ? 1.05 : 1 }}
                        whileTap={{ scale: currentPage !== totalPages ? 0.95 : 1 }}
                      >
                        Next →
                      </motion.button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ABOUT SECTION */}
          {activeSection === 'about' && (
            <motion.div
              key="about"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="vintage-about-section"
            >
              <motion.h2
                className="vintage-section-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                About the Artist
              </motion.h2>
              <motion.div
                className="vintage-about-content"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[
                  "For over a decade, I've been capturing the world through my lens, finding beauty in the ordinary and magic in fleeting moments. My journey began in the darkrooms of old studios, where the smell of developer and fixer became as familiar as morning coffee.",
                  "My grandfather gifted me my first camera - a vintage Kodak Brownie that taught me the value of every shot. In this digital age, I carry forward the lessons of patience and composition learned from those film days. Each click is a deliberate act, each frame a carefully composed story.",
                  "Photography, to me, is the art of seeing. It's about capturing the interplay of light and shadow, the unspoken emotions, the stories that unfold in a single moment. Through my lens, I seek to preserve not just images, but feelings, memories, and the very essence of time itself."
                ].map((text, index) => (
                  <motion.p
                    key={index}
                    className="vintage-about-text"
                    variants={fadeInUp}
                    transition={{ delay: index * 0.2 }}
                  >
                    {text}
                  </motion.p>
                ))}
              </motion.div>
            </motion.div>
          )}



          {/* GEAR SECTION - Updated with Management */}
          {activeSection === 'gear' && (
            <motion.div
              key="gear"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="vintage-gear-section"
            >
              <motion.h2
                className="vintage-section-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                My Arsenal
              </motion.h2>

              {/* Gear Controls */}
              {user?.role === 'admin' && (
                < motion.div className="vintage-controls"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="vintage-filter-container">
                    {gearTypes.map(type => (
                      <motion.button
                        key={type.id}
                        onClick={() => setGearFilter(type.id)}
                        className={`vintage-filter-btn ${gearFilter === type.id ? 'active' : ''}`}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {type.label}
                      </motion.button>
                    ))}
                  </div>
                  {user?.role === 'admin' && (
                    <motion.button
                      onClick={() => { resetGearForm(); setShowGearModal(true); }}
                      className="vintage-btn-primary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ➕ Add Gear
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Gear Grid */}
              <motion.div
                className="vintage-gear-grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {gear.map((item, index) => (
                  <motion.div
                    key={item._id}
                    className="vintage-gear-card"
                    variants={scaleIn}
                    whileHover={{
                      scale: 1.05,
                      y: -5
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {item.imageUrl && (
                      <motion.img
                        src={API_URL.replace('/api', '') + item.imageUrl}
                        alt={item.name}
                        className="vintage-gear-image"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                    <div className="vintage-gear-content">
                      <h3 className="vintage-gear-title">{item.name}</h3>
                      <p className="vintage-gear-type">{item.type}</p>
                      <p className="vintage-gear-brand">{item.brand} {item.model}</p>
                      <p className="vintage-gear-description">{item.description}</p>
                      {Object.keys(item.specs || {}).length > 0 && (
                        <div className="vintage-gear-specs">
                          <h4>Specifications:</h4>
                          {Object.entries(item.specs).map(([key, value]) => (
                            <p key={key}><strong>{key}:</strong> {value}</p>
                          ))}
                        </div>
                      )}
                      // In the Gear Section, update the gear actions buttons:
                      {user?.role === 'admin' && (
                        <motion.div
                          className="vintage-gear-actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGear(item);
                            }}
                            className="vintage-icon-btn"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            ✏️
                          </motion.button>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGear(item._id);
                            }}
                            className="vintage-icon-btn"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            🗑️
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* CONTACT SECTION - Keep existing contact section */}

          {/* CONTACT SECTION */}
          {activeSection === 'contact' && (
            <motion.div
              key="contact"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="vintage-contact-section"
            >
              <motion.h2
                className="vintage-section-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Get In Touch
              </motion.h2>
              <motion.form
                onSubmit={handleContactSubmit}
                className="vintage-contact-form"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[
                  { type: 'text', placeholder: 'Your Name *', value: contactForm.name, key: 'name' },
                  { type: 'email', placeholder: 'Your Email *', value: contactForm.email, key: 'email' },
                  { type: 'tel', placeholder: 'Phone Number', value: contactForm.phone, key: 'phone' },
                  { type: 'text', placeholder: 'Subject', value: contactForm.subject, key: 'subject' },
                ].map((field, index) => (
                  <motion.input
                    key={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(e) => setContactForm({ ...contactForm, [field.key]: e.target.value })}
                    required={field.placeholder.includes('*')}
                    className="vintage-input"
                    variants={fadeInUp}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  />
                ))}

                <motion.select
                  value={contactForm.projectType}
                  onChange={(e) => setContactForm({ ...contactForm, projectType: e.target.value })}
                  className="vintage-input"
                  variants={fadeInUp}
                  whileFocus={{ scale: 1.02 }}
                >
                  <option value="">Select Project Type</option>
                  <option value="portrait">Portrait Session</option>
                  <option value="wedding">Wedding Photography</option>
                  <option value="commercial">Commercial Work</option>
                  <option value="event">Event Coverage</option>
                  <option value="film">Film Photography</option>
                  <option value="other">Other</option>
                </motion.select>

                <motion.textarea
                  placeholder="Your Message *"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  rows="6"
                  className="vintage-input"
                  variants={fadeInUp}
                  whileFocus={{ scale: 1.02 }}
                />

                <motion.button
                  type="submit"
                  className="vintage-btn-primary"
                  variants={fadeInUp}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send Message
                </motion.button>
              </motion.form>
            </motion.div>
          )}

          {/* DASHBOARD SECTION */}
          {activeSection === 'dashboard' && user?.role === 'admin' && (
            <motion.div
              key="dashboard"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="vintage-dashboard-section"
            >
              <motion.h2
                className="vintage-section-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Dashboard Overview
              </motion.h2>

              {stats ? (
                <motion.div
                  className="vintage-stats-grid"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Stats Cards */}
                  {[
                    { label: 'Total Posts', value: stats.totalPosts, icon: '📝' },
                    { label: 'Total Views', value: stats.totalViews, icon: '👁️' },
                    { label: 'Total Likes', value: stats.totalLikes, icon: '❤️' },
                    { label: 'Total Messages', value: stats.totalMessages, icon: '📨' },
                    { label: 'Unread Messages', value: stats.unreadMessages, icon: '✉️' },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="vintage-stat-card"
                      variants={fadeInUp}
                      whileHover={{ scale: 1.05, y: -5 }}
                    >
                      <div className="vintage-stat-icon">{stat.icon}</div>
                      <div className="vintage-stat-value">{stat.value}</div>
                      <div className="vintage-stat-label">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="vintage-loading">Loading stats...</div>
              )}

              {/* Recent Posts and Top Posts */}
              {stats && (
                <motion.div
                  className="vintage-dashboard-content"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="vintage-dashboard-column">
                    <h3>Recent Posts</h3>
                    {stats.recentPosts?.map((post, index) => (
                      <motion.div
                        key={post._id}
                        className="vintage-dashboard-item"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <img src={API_URL.replace('/api', '') + post.mediaUrl} alt={post.title} />
                        <div>
                          <strong>{post.title}</strong>
                          <p>{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="vintage-dashboard-column">
                    <h3>Top Posts</h3>
                    {stats.topPosts?.map((post, index) => (
                      <motion.div
                        key={post._id}
                        className="vintage-dashboard-item"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <img src={API_URL.replace('/api', '') + post.mediaUrl} alt={post.title} />
                        <div>
                          <strong>{post.title}</strong>
                          <p>👁️ {post.views} views</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* CONTACTS SECTION */}
          {activeSection === 'contacts' && user?.role === 'admin' && (
            <motion.div
              key="contacts"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="vintage-contacts-section"
            >
              <motion.h2
                className="vintage-section-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Contact Messages
              </motion.h2>

              <motion.div
                className="vintage-contacts-list"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {contacts.map((contact, index) => (
                  <motion.div
                    key={contact._id}
                    className={`vintage-contact-card ${contact.status}`}
                    variants={fadeInUp}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div className="vintage-contact-header">
                      <div className="vintage-contact-info">
                        <h3>{contact.name}</h3>
                        <p>{contact.email} {contact.phone && `• ${contact.phone}`}</p>
                        <span className={`vintage-contact-status ${contact.status}`}>
                          {contact.status}
                        </span>
                      </div>
                      <div className="vintage-contact-meta">
                        <p>{new Date(contact.createdAt).toLocaleDateString()}</p>
                        <p>{contact.projectType}</p>
                      </div>
                    </div>
                    <div className="vintage-contact-content">
                      <h4>{contact.subject}</h4>
                      <p>{contact.message}</p>
                    </div>
                    <div className="vintage-contact-actions">
                      <select
                        value={contact.status}
                        onChange={(e) => updateContactStatus(contact._id, e.target.value)}
                        className="vintage-status-select"
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* GEAR MODAL */}
      <AnimatePresence>
        {showGearModal && (
          <motion.div
            className="vintage-modal"
            onClick={() => setShowGearModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="vintage-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="vintage-modal-header">
                <h3>{gearForm._id ? 'Edit Gear' : 'Add New Gear'}</h3>
                <motion.button
                  onClick={() => setShowGearModal(false)}
                  className="vintage-close-btn"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              <form onSubmit={handleCreateGear} className="vintage-gear-form">
                {/* Gear Image Upload */}
                <motion.div
                  className="vintage-file-upload-area"
                  whileHover={{ scale: 1.02 }}
                >
                  {gearPreview ? (
                    <motion.div
                      className="vintage-preview-container"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <img src={gearPreview} alt="Preview" className="vintage-preview" />
                      <motion.button
                        type="button"
                        onClick={() => { setGearFile(null); setGearPreview(null); }}
                        className="vintage-remove-preview-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Remove
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.label
                      className="vintage-file-label"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.span
                        className="vintage-upload-icon"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        📸
                      </motion.span>
                      <span>Click to upload gear image</span>
                      <input type="file" onChange={handleGearFileChange} accept="image/*" style={{ display: 'none' }} />
                    </motion.label>
                  )}
                </motion.div>

                <motion.div
                  className="vintage-form-grid"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    { type: 'text', placeholder: 'Gear Name *', value: gearForm.name, key: 'name' },
                    { type: 'select', value: gearForm.type, key: 'type', options: gearTypes.filter(t => t.id !== 'all').map(t => t.id) },
                    { type: 'text', placeholder: 'Brand', value: gearForm.brand, key: 'brand' },
                    { type: 'text', placeholder: 'Model', value: gearForm.model, key: 'model' },
                  ].map((field, index) => (
                    <motion.div key={field.key} variants={fadeInUp}>
                      {field.type === 'select' ? (
                        <select
                          value={gearForm[field.key]}
                          onChange={(e) => setGearForm({ ...gearForm, [field.key]: e.target.value })}
                          className="vintage-input"
                        >
                          {field.options.map(option => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={gearForm[field.key]}
                          onChange={(e) => setGearForm({ ...gearForm, [field.key]: e.target.value })}
                          required={field.placeholder?.includes('*')}
                          className="vintage-input"
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                <motion.textarea
                  placeholder="Description"
                  value={gearForm.description}
                  onChange={(e) => setGearForm({ ...gearForm, description: e.target.value })}
                  rows="4"
                  className="vintage-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                />

                <motion.div
                  className="vintage-modal-footer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    type="button"
                    onClick={() => setShowGearModal(false)}
                    className="vintage-btn-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="vintage-btn-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    💾 {gearForm._id ? 'Update' : 'Add'} Gear
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keep existing modals for Auth, Upload, and Post Detail */}

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            className="vintage-modal"
            onClick={() => setShowUploadModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="vintage-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="vintage-modal-header">
                <h3>{postForm._id ? 'Edit Post' : 'Create New Post'}</h3>
                <motion.button
                  onClick={() => setShowUploadModal(false)}
                  className="vintage-close-btn"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              <form onSubmit={handleCreatePost} className="vintage-upload-form">
                {/* Media Upload */}
                <motion.div
                  className="vintage-file-upload-area"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  {mediaPreview ? (
                    <motion.div
                      className="vintage-preview-container"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <img src={mediaPreview} alt="Preview" className="vintage-preview" />
                      <motion.button
                        type="button"
                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                        className="vintage-remove-preview-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Remove
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.label
                      className="vintage-file-label"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.span
                        className="vintage-upload-icon"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        📤
                      </motion.span>
                      <span>Click to upload photo/video</span>
                      <input type="file" onChange={handleFileChange} accept="image/*,video/*" style={{ display: 'none' }} />
                    </motion.label>
                  )}
                </motion.div>

                <motion.div
                  className="vintage-form-grid"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    { type: 'text', placeholder: 'Title *', value: postForm.title, key: 'title' },
                    { type: 'select', value: postForm.type, key: 'type', options: ['photo', 'video'] },
                    { type: 'select', value: postForm.category, key: 'category', options: categories.filter(c => c.id !== 'all').map(c => c.id) },
                    { type: 'text', placeholder: 'Location', value: postForm.location, key: 'location' },
                    { type: 'date', value: postForm.date, key: 'date' },
                    { type: 'time', value: postForm.time, key: 'time' },
                  ].map((field, index) => (
                    <motion.div key={field.key} variants={fadeInUp}>
                      {field.type === 'select' ? (
                        <select
                          value={postForm[field.key]}
                          onChange={(e) => setPostForm({ ...postForm, [field.key]: e.target.value })}
                          className="vintage-input"
                        >
                          {field.options.map(option => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={postForm[field.key]}
                          onChange={(e) => setPostForm({ ...postForm, [field.key]: e.target.value })}
                          required={field.placeholder?.includes('*')}
                          className="vintage-input"
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                <motion.textarea
                  placeholder="Story *"
                  value={postForm.story}
                  onChange={(e) => setPostForm({ ...postForm, story: e.target.value })}
                  required
                  rows="4"
                  className="vintage-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                />

                <motion.div
                  className="vintage-form-grid"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    { placeholder: "Camera", value: postForm.camera, key: 'camera' },
                    { placeholder: "Lens", value: postForm.lens, key: 'lens' },
                    { placeholder: "ISO", value: postForm.iso, key: 'iso' },
                    { placeholder: "Aperture", value: postForm.aperture, key: 'aperture' },
                    { placeholder: "Shutter Speed", value: postForm.shutterSpeed, key: 'shutterSpeed' },
                  ].map((field, index) => (
                    <motion.input
                      key={field.key}
                      type="text"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => setPostForm({ ...postForm, [field.key]: e.target.value })}
                      className="vintage-input"
                      variants={fadeInUp}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    />
                  ))}
                </motion.div>

                <motion.div
                  className="vintage-modal-footer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="vintage-btn-secondary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="vintage-btn-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    💾 {postForm._id ? 'Update' : 'Publish'}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            className="vintage-modal"
            onClick={() => setShowAuthModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="vintage-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="vintage-modal-header">
                <h3>{authMode === 'login' ? 'Login' : 'Register'}</h3>
                <motion.button
                  onClick={() => setShowAuthModal(false)}
                  className="vintage-close-btn"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              <form onSubmit={handleAuth} className="vintage-auth-form">
                {authMode === 'register' && (
                  <motion.input
                    type="text"
                    placeholder="Username"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    required
                    className="vintage-input"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    whileFocus={{ scale: 1.02 }}
                  />
                )}
                <motion.input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                  className="vintage-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileFocus={{ scale: 1.02 }}
                />
                <motion.input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                  className="vintage-input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileFocus={{ scale: 1.02 }}
                />
                <motion.button
                  type="submit"
                  className="vintage-btn-primary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {authMode === 'login' ? 'Login' : 'Register'}
                </motion.button>
                <motion.p
                  className="vintage-auth-toggle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <motion.button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="vintage-link-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {authMode === 'login' ? 'Register' : 'Login'}
                  </motion.button>
                </motion.p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POST DETAIL MODAL */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="vintage-modal"
            onClick={() => setSelectedPost(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="vintage-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.button
                onClick={() => setSelectedPost(null)}
                className="vintage-close-btn"
                style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
              <motion.img
                src={API_URL.replace('/api', '') + selectedPost.mediaUrl}
                alt={selectedPost.title}
                className="vintage-detail-image"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              />
              <motion.div
                className="vintage-detail-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="vintage-detail-left">
                  <h2 className="vintage-detail-title">{selectedPost.title}</h2>
                  <div className="vintage-detail-meta">
                    <span>📍 {selectedPost.location}</span>
                    <span>📅 {new Date(selectedPost.date).toLocaleDateString()}</span>
                    {selectedPost.time && <span>🕐 {selectedPost.time}</span>}
                  </div>
                  <p className="vintage-detail-story">{selectedPost.story}</p>
                  <div className="vintage-detail-actions">
                    <motion.button
                      onClick={() => handleLikePost(selectedPost._id)}
                      className="vintage-like-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ❤️ Like ({selectedPost.likes})
                    </motion.button>
                  </div>
                </div>
                <motion.div
                  className="vintage-detail-right"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <h3 className="vintage-tech-title">Technical Details</h3>
                  <div className="vintage-tech-details">
                    {[
                      { label: 'Camera', value: selectedPost.camera },
                      { label: 'Lens', value: selectedPost.lens },
                      { label: 'ISO', value: selectedPost.iso },
                      { label: 'Aperture', value: selectedPost.aperture },
                      { label: 'Shutter', value: selectedPost.shutterSpeed },
                      { label: 'Views', value: selectedPost.views }
                    ].map((item, index) => (
                      <motion.div
                        key={item.label}
                        className="vintage-tech-row"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        <strong>{item.label}:</strong> {item.value}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div >
  );
}

export default App;