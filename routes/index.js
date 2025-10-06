// Main Routes Configuration for Jurnal Digital SMKN 4 Jakarta
// File: routes/index.js
const express = require('express');
const router = express.Router();
// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const guruRoutes = require('./guru');
const siswaRoutes = require('./siswa');
const jurnalRoutes = require('./jurnal');
const jurusanRoutes = require('./jurusan');
const mappingRoutes = require('./mapping');
// API Health Check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Jurnal Digital SMKN 4 Jakarta',
        version: '1.0.0'
    });
});
// Route definitions
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/guru', guruRoutes);
router.use('/siswa', siswaRoutes);
router.use('/jurnal', jurnalRoutes);
router.use('/jurusan', jurusanRoutes);
router.use('/mapping', mappingRoutes);
// 404 handler
router.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested endpoint does not exist',
        timestamp: new Date().toISOString()
    });
});
module.exports = router;