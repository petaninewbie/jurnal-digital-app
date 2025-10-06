import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi'
      });
    }

    // Demo user untuk testing
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { userId: 'demo123', username: 'admin' },
        process.env.JWT_SECRET || 'secret123',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Login berhasil',
        data: {
          user: { username: 'admin', role: 'admin' },
          token
        }
      });
    }

    res.status(401).json({
      success: false,
      message: 'Username atau password salah'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}