// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchStats();
            fetchContacts();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await axios.get(`${API_URL}/contact`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setContacts(response.data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const updateContactStatus = async (id, status) => {
        try {
            await axios.put(`${API_URL}/contact/${id}`, { status }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchContacts();
        } catch (error) {
            console.error('Error updating contact status:', error);
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="vintage-admin-denied">
                <h2>🔒 Admin Access Required</h2>
                <p>You need administrator privileges to access this section.</p>
            </div>
        );
    }

    return (
        <div className="vintage-admin-dashboard">
            <h2>Admin Dashboard</h2>

            {/* Tab Navigation */}
            <div className="vintage-admin-tabs">
                {['overview', 'contacts', 'posts', 'gear'].map(tab => (
                    <motion.button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`vintage-admin-tab ${activeTab === tab ? 'active' : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </motion.button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
                <motion.div
                    className="vintage-stats-grid"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <motion.div className="vintage-stat-card" whileHover={{ scale: 1.02 }}>
                        <h3>Total Posts</h3>
                        <p className="vintage-stat-number">{stats.totalPosts}</p>
                    </motion.div>

                    <motion.div className="vintage-stat-card" whileHover={{ scale: 1.02 }}>
                        <h3>Total Views</h3>
                        <p className="vintage-stat-number">{stats.totalViews}</p>
                    </motion.div>

                    <motion.div className="vintage-stat-card" whileHover={{ scale: 1.02 }}>
                        <h3>Total Likes</h3>
                        <p className="vintage-stat-number">{stats.totalLikes}</p>
                    </motion.div>

                    <motion.div className="vintage-stat-card" whileHover={{ scale: 1.02 }}>
                        <h3>Messages</h3>
                        <p className="vintage-stat-number">{stats.totalMessages}</p>
                        <small>{stats.unreadMessages} unread</small>
                    </motion.div>

                    {/* Category Distribution */}
                    <div className="vintage-category-stats">
                        <h3>Posts by Category</h3>
                        {stats.postsByCategory?.map(cat => (
                            <div key={cat._id} className="vintage-category-item">
                                <span>{cat._id}:</span>
                                <span>{cat.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Top Posts */}
                    <div className="vintage-top-posts">
                        <h3>Top Posts</h3>
                        {stats.topPosts?.map(post => (
                            <div key={post._id} className="vintage-top-post">
                                <span>{post.title}</span>
                                <span>👁️ {post.views}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
                <motion.div
                    className="vintage-contacts-list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {contacts.map(contact => (
                        <motion.div
                            key={contact._id}
                            className={`vintage-contact-item ${contact.status}`}
                            whileHover={{ scale: 1.01 }}
                        >
                            <div className="vintage-contact-header">
                                <h4>{contact.name}</h4>
                                <span className="vintage-contact-email">{contact.email}</span>
                                <span className={`vintage-contact-status ${contact.status}`}>
                                    {contact.status}
                                </span>
                            </div>

                            <p className="vintage-contact-subject">{contact.subject}</p>
                            <p className="vintage-contact-message">{contact.message}</p>

                            {contact.phone && <p>📞 {contact.phone}</p>}
                            {contact.projectType && <p>📋 {contact.projectType}</p>}

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

                                <span className="vintage-contact-date">
                                    {new Date(contact.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

export default AdminDashboard;