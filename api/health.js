export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Jurnal Digital SMKN 4',
    version: '1.0.0'
  });
}