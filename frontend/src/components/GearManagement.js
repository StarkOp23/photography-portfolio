// src/components/GearManagement.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const GearManagement = ({ user }) => {
    const [gear, setGear] = useState([]);
    const [showGearModal, setShowGearModal] = useState(false);
    const [gearForm, setGearForm] = useState({
        name: '', type: 'camera', brand: '', model: '', description: '',
        specs: { weight: '', dimensions: '', features: '' }, purchaseDate: '', condition: 'excellent'
    });
    const [gearImage, setGearImage] = useState(null);
    const [gearImagePreview, setGearImagePreview] = useState(null);

    const gearTypes = ['camera', 'lens', 'tripod', 'lighting', 'accessory', 'film', 'other'];

    const fetchGear = async () => {
        try {
            const response = await axios.get(`${API_URL}/gear`);
            setGear(response.data);
        } catch (error) {
            console.error('Error fetching gear:', error);
        }
    };

    const handleGearSubmit = async (e) => {
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
            if (gearImage) formData.append('image', gearImage);

            if (gearForm._id) {
                await axios.put(`${API_URL}/gear/${gearForm._id}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            } else {
                await axios.post(`${API_URL}/gear`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            }

            setShowGearModal(false);
            resetGearForm();
            fetchGear();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save gear');
        }
    };

    const handleDeleteGear = async (id) => {
        if (!window.confirm('Delete this gear item?')) return;
        try {
            await axios.delete(`${API_URL}/gear/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchGear();
        } catch (error) {
            alert('Failed to delete gear');
        }
    };

    const resetGearForm = () => {
        setGearForm({
            name: '', type: 'camera', brand: '', model: '', description: '',
            specs: { weight: '', dimensions: '', features: '' }, purchaseDate: '', condition: 'excellent'
        });
        setGearImage(null);
        setGearImagePreview(null);
    };

    return (
        <div className="vintage-gear-management">
            <div className="vintage-section-header">
                <h2>Gear Management</h2>
                {user?.role === 'admin' && (
                    <motion.button
                        onClick={() => setShowGearModal(true)}
                        className="vintage-btn-primary"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ➕ Add Gear
                    </motion.button>
                )}
            </div>

            {/* Gear List */}
            <div className="vintage-gear-grid">
                {gear.map((item) => (
                    <motion.div
                        key={item._id}
                        className="vintage-gear-card"
                        whileHover={{ scale: 1.02, y: -5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        {item.imageUrl && (
                            <img
                                src={`${API_URL.replace('/api', '')}${item.imageUrl}`}
                                alt={item.name}
                                className="vintage-gear-image"
                            />
                        )}
                        <div className="vintage-gear-info">
                            <h3>{item.name}</h3>
                            <p className="vintage-gear-type">{item.type}</p>
                            <p className="vintage-gear-brand">{item.brand} {item.model}</p>
                            <p className="vintage-gear-description">{item.description}</p>

                            {user?.role === 'admin' && (
                                <div className="vintage-gear-actions">
                                    <motion.button
                                        onClick={() => {
                                            setGearForm({ ...item, _id: item._id });
                                            setGearImagePreview(item.imageUrl ? `${API_URL.replace('/api', '')}${item.imageUrl}` : null);
                                            setShowGearModal(true);
                                        }}
                                        className="vintage-icon-btn"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        ✏️
                                    </motion.button>
                                    <motion.button
                                        onClick={() => handleDeleteGear(item._id)}
                                        className="vintage-icon-btn"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        🗑️
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Gear Modal */}
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
                        >
                            <div className="vintage-modal-header">
                                <h3>{gearForm._id ? 'Edit Gear' : 'Add New Gear'}</h3>
                                <motion.button
                                    onClick={() => setShowGearModal(false)}
                                    className="vintage-close-btn"
                                    whileHover={{ scale: 1.2, rotate: 90 }}
                                >
                                    ✕
                                </motion.button>
                            </div>

                            <form onSubmit={handleGearSubmit} className="vintage-gear-form">
                                {/* Image Upload */}
                                <div className="vintage-file-upload-area">
                                    {gearImagePreview ? (
                                        <div className="vintage-preview-container">
                                            <img src={gearImagePreview} alt="Preview" className="vintage-preview" />
                                            <button type="button" onClick={() => { setGearImage(null); setGearImagePreview(null); }}>
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="vintage-file-label">
                                            <span>📷 Upload Gear Image</span>
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setGearImage(file);
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setGearImagePreview(reader.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="vintage-form-grid">
                                    <input
                                        type="text"
                                        placeholder="Gear Name *"
                                        value={gearForm.name}
                                        onChange={(e) => setGearForm({ ...gearForm, name: e.target.value })}
                                        required
                                        className="vintage-input"
                                    />

                                    <select
                                        value={gearForm.type}
                                        onChange={(e) => setGearForm({ ...gearForm, type: e.target.value })}
                                        className="vintage-input"
                                    >
                                        {gearTypes.map(type => (
                                            <option key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="Brand"
                                        value={gearForm.brand}
                                        onChange={(e) => setGearForm({ ...gearForm, brand: e.target.value })}
                                        className="vintage-input"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Model"
                                        value={gearForm.model}
                                        onChange={(e) => setGearForm({ ...gearForm, model: e.target.value })}
                                        className="vintage-input"
                                    />

                                    <input
                                        type="date"
                                        value={gearForm.purchaseDate}
                                        onChange={(e) => setGearForm({ ...gearForm, purchaseDate: e.target.value })}
                                        className="vintage-input"
                                    />

                                    <select
                                        value={gearForm.condition}
                                        onChange={(e) => setGearForm({ ...gearForm, condition: e.target.value })}
                                        className="vintage-input"
                                    >
                                        <option value="excellent">Excellent</option>
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>

                                <textarea
                                    placeholder="Description"
                                    value={gearForm.description}
                                    onChange={(e) => setGearForm({ ...gearForm, description: e.target.value })}
                                    rows="3"
                                    className="vintage-input"
                                />

                                <div className="vintage-specs-grid">
                                    <h4>Specifications</h4>
                                    <input
                                        type="text"
                                        placeholder="Weight"
                                        value={gearForm.specs.weight}
                                        onChange={(e) => setGearForm({
                                            ...gearForm,
                                            specs: { ...gearForm.specs, weight: e.target.value }
                                        })}
                                        className="vintage-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dimensions"
                                        value={gearForm.specs.dimensions}
                                        onChange={(e) => setGearForm({
                                            ...gearForm,
                                            specs: { ...gearForm.specs, dimensions: e.target.value }
                                        })}
                                        className="vintage-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Features"
                                        value={gearForm.specs.features}
                                        onChange={(e) => setGearForm({
                                            ...gearForm,
                                            specs: { ...gearForm.specs, features: e.target.value }
                                        })}
                                        className="vintage-input"
                                    />
                                </div>

                                <div className="vintage-modal-footer">
                                    <button type="button" onClick={() => setShowGearModal(false)} className="vintage-btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="vintage-btn-primary">
                                        💾 {gearForm._id ? 'Update' : 'Save'} Gear
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GearManagement;