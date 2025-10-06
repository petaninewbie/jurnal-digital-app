// Jurnal Harian Routes - 7 Kebiasaan Anak Indonesia Hebat
// File: routes/jurnal.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');
const { getDatabase } = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();
// 7 Kebiasaan Anak Indonesia Hebat
const KEBIASAAN_LIST = [
    'Religius',
    'Nasionalis',
    'Mandiri',
    'Gotong Royong',
    'Integritas',
    'Kreatif',
    'Bernalar Kritis'
];
// POST /api/jurnal - Create new journal entry
router.post('/', auth, [
    body('siswa_id').isMongoId().withMessage('ID siswa tidak valid'),
    body('tanggal').isISO8601().withMessage('Format tanggal tidak valid'),
    body('kebiasaan').isIn(KEBIASAAN_LIST).withMessage('Kebiasaan tidak valid'),
    body('aktivitas').isLength({ min: 10 }).withMessage('Aktivitas minimal 10 karakter'),
    body('refleksi').isLength({ min: 20 }).withMessage('Refleksi minimal 20 karakter'),
    body('nilai_karakter').isInt({ min: 1, max: 5 }).withMessage('Nilai karakter 1-5')
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
            siswa_id,
            tanggal,
            kebiasaan,
            aktivitas,
            refleksi,
            nilai_karakter,
            foto_kegiatan,
            catatan_guru
        } = req.body;
        const db = await getDatabase();
        // Check if siswa exists
        const siswa = await db.collection('siswa').findOne({
            _id: new ObjectId(siswa_id)
        });
        if (!siswa) {
            return res.status(404).json({
                success: false,
                message: 'Siswa tidak ditemukan'
            });
        }
        // Check if journal entry already exists for this date and habit
        const existingEntry = await db.collection('jurnal_harian').findOne({
            siswa_id: new ObjectId(siswa_id),
            tanggal: new Date(tanggal),
            kebiasaan
        });
        if (existingEntry) {
            return res.status(400).json({
                success: false,
                message: 'Jurnal untuk kebiasaan ini sudah ada pada tanggal tersebut'
            });
        }
        // Create journal entry
        const jurnalEntry = {
            siswa_id: new ObjectId(siswa_id),
            nama_siswa: siswa.nama_lengkap,
            kelas: siswa.kelas,
            jurusan: siswa.jurusan,
            tanggal: new Date(tanggal),
            kebiasaan,
            aktivitas,
            refleksi,
            nilai_karakter: parseInt(nilai_karakter),
            foto_kegiatan: foto_kegiatan || null,
            catatan_guru: catatan_guru || '',
            status: 'submitted',
            created_by: req.user.userId,
            created_at: new Date(),
            updated_at: new Date()
        };
        const result = await db.collection('jurnal_harian').insertOne(jurnalEntry);
        res.status(201).json({
            success: true,
            message: 'Jurnal berhasil disimpan',
            data: {
                id: result.insertedId,
                ...jurnalEntry
            }
        });
    } catch (error) {
        console.error('Create jurnal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// GET /api/jurnal - Get journal entries with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            siswa_id,
            tanggal_mulai,
            tanggal_selesai,
            kebiasaan,
            kelas,
            jurusan,
            page = 1,
            limit = 10
        } = req.query;
        const db = await getDatabase();
        const filter = {};
        // Build filter
        if (siswa_id) filter.siswa_id = new ObjectId(siswa_id);
        if (kebiasaan) filter.kebiasaan = kebiasaan;
        if (kelas) filter.kelas = kelas;
        if (jurusan) filter.jurusan = jurusan;
        if (tanggal_mulai || tanggal_selesai) {
            filter.tanggal = {};
            if (tanggal_mulai) filter.tanggal.$gte = new Date(tanggal_mulai);
            if (tanggal_selesai) filter.tanggal.$lte = new Date(tanggal_selesai);
        }
        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [entries, total] = await Promise.all([
            db.collection('jurnal_harian')
                .find(filter)
                .sort({ tanggal: -1, created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .toArray(),
            db.collection('jurnal_harian').countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: {
                entries,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / parseInt(limit)),
                    total_entries: total,
                    per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get jurnal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// PUT /api/jurnal/:id - Update journal entry
router.put('/:id', auth, [
    body('aktivitas').optional().isLength({ min: 10 }).withMessage('Aktivitas minimal 10 karakter'),
    body('refleksi').optional().isLength({ min: 20 }).withMessage('Refleksi minimal 20 karakter'),
    body('nilai_karakter').optional().isInt({ min: 1, max: 5 }).withMessage('Nilai karakter 1-5')
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
        const db = await getDatabase();
        const result = await db.collection('jurnal_harian').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Jurnal tidak ditemukan'
            });
        }
        res.json({
            success: true,
            message: 'Jurnal berhasil diperbarui'
        });
    } catch (error) {
        console.error('Update jurnal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: error.message
        });
    }
});
// GET /api/jurnal/kebiasaan - Get list of habits
router.get('/kebiasaan', (req, res) => {
    res.json({
        success: true,
        data: {
            kebiasaan: KEBIASAAN_LIST,
            total: KEBIASAAN_LIST.length
        }
    });
});
module.exports = router;