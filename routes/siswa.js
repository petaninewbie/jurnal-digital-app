// Siswa Management Routes
// File: routes/siswa.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();
// POST /api/siswa - Create new student
router.post('/', auth, [
    body('nis').isLength({ min: 8, max: 10 }).withMessage('NIS harus 8-10 karakter'),
    body('nama_lengkap').isLength({ min: 3 }).withMessage('Nama minimal 3 karakter'),
    body('kelas').notEmpty().withMessage('Kelas wajib diisi'),
    body('jurusan').notEmpty().withMessage('Jurusan wajib diisi'),
    body('email').optional().isEmail().withMessage('Email tidak valid')
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
        const {
            nis,
            nama_lengkap,
            kelas,
            jurusan,
            email,
            no_hp,
            alamat,
            tanggal_lahir,
            jenis_kelamin,
            nama_orang_tua,
            no_hp_orang_tua
        } = req.body;
        const db = await getDatabase();
        // Check if NIS already exists
        const existingSiswa = await db.collection('siswa').findOne({ nis });
        if (existingSiswa) {
            return res.status(400).json({
                success: false,
                message: 'NIS sudah terdaftar'
            });
        }
        // Create new student
        const newSiswa = {
            nis,
            nama_lengkap,
            kelas,
            jurusan,
            email: email || null,
            no_hp: no_hp || null,
            alamat: alamat || null,
            tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : null,
            jenis_kelamin: jenis_kelamin || null,
            nama_orang_tua: nama_orang_tua || null,
            no_hp_orang_tua: no_hp_orang_tua || null,
            status: 'active',
            created_by: req.user.userId,
            created_at: new Date(),
            updated_at: new Date()
        };
        const result = await db.collection('siswa').insertOne(newSiswa);
        res.status(201).json({
            success: true,
            message: 'Siswa berhasil ditambahkan',
            data: {
                id: result.insertedId,
                ...newSiswa
            }
        });
    } catch (error) {
        console.error('Create siswa error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// GET /api/siswa - Get all students with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            kelas,
            jurusan,
            status = 'active',
            search,
            page = 1,
            limit = 10
        } = req.query;
        const db = await getDatabase();
        const filter = { status };
        // Build filter
        if (kelas) filter.kelas = kelas;
        if (jurusan) filter.jurusan = jurusan;
        if (search) {
            filter.$or = [
                { nama_lengkap: { $regex: search, $options: 'i' } },
                { nis: { $regex: search, $options: 'i' } }
            ];
        }
        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [siswa, total] = await Promise.all([
            db.collection('siswa')
                .find(filter)
                .sort({ nama_lengkap: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .toArray(),
            db.collection('siswa').countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: {
                siswa,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / parseInt(limit)),
                    total_students: total,
                    per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get siswa error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// GET /api/siswa/:id - Get student by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDatabase();
        const siswa = await db.collection('siswa').findOne({
            _id: new ObjectId(id)
        });
        if (!siswa) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }
        // Get journal statistics
        const jurnalStats = await db.collection('jurnal_harian').aggregate([
            { $match: { siswa_id: new ObjectId(id) } },
            {
                $group: {
                    _id: '$kebiasaan',
                    total_entries: { $sum: 1 },
                    avg_nilai: { $avg: '$nilai_karakter' }
                }
            }
        ]).toArray();
        res.json({
            success: true,
            data: {
                siswa,
                jurnal_statistics: jurnalStats
            }
        });
    } catch (error) {
        console.error('Get siswa by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// PUT /api/siswa/:id - Update student
router.put('/:id', auth, [
    body('nama_lengkap').optional().isLength({ min: 3 }).withMessage('Nama minimal 3 karakter'),
    body('email').optional().isEmail().withMessage('Email tidak valid')
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
        const { id } = req.params;
        const updateData = { ...req.body };
        updateData.updated_at = new Date();
        if (updateData.tanggal_lahir) {
            updateData.tanggal_lahir = new Date(updateData.tanggal_lahir);
        }
        const db = await getDatabase();
        const result = await db.collection('siswa').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }
        res.json({
            success: true,
            message: 'Data siswa berhasil diperbarui'
        });
    } catch (error) {
        console.error('Update siswa error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
module.exports = router;