// Authentication Routes for Jurnal Digital
// File: routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../config/database');
const router = express.Router();
// POST /api/auth/register - Register new user
router.post('/register', [
    body('username').isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
    body('email').isEmail().withMessage('Email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').isIn(['admin', 'guru', 'siswa']).withMessage('Role tidak valid')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }
        const { username, email, password, role, nama_lengkap } = req.body;
        const db = await getDatabase();
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username atau email sudah terdaftar'
            });
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Create new user
        const newUser = {
            username,
            email,
            password: hashedPassword,
            role,
            nama_lengkap: nama_lengkap || username,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
            last_login: null
        };
        const result = await db.collection('users').insertOne(newUser);
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: result.insertedId, 
                username, 
                role 
            },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );
        res.status(201).json({
            success: true,
            message: 'User berhasil didaftarkan',
            data: {
                user: {
                    id: result.insertedId,
                    username,
                    email,
                    role,
                    nama_lengkap: newUser.nama_lengkap
                },
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// POST /api/auth/login - User login
router.post('/login', [
    body('username').notEmpty().withMessage('Username wajib diisi'),
    body('password').notEmpty().withMessage('Password wajib diisi')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }
        const { username, password } = req.body;
        const db = await getDatabase();
        // Find user
        const user = await db.collection('users').findOne({
            $or: [{ username }, { email: username }]
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }
        // Update last login
        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { last_login: new Date() } }
        );
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '24h' }
        );
        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    nama_lengkap: user.nama_lengkap
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout berhasil'
    });
});
module.exports = router;