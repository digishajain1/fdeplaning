import { Router } from 'express';
import { getDatabase, scheduleSave } from '../db/init.js';

const router = Router();

// GET /api/commitments - Get all commitment rows
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec(`
      SELECT row_key, output_name, description, owner_deadline, updated_at
      FROM commitments
      ORDER BY id ASC
    `);
    
    // Return as object keyed by row_key for easy client lookup
    const data = {};
    if (result.length > 0) {
      for (const row of result[0].values) {
        const [row_key, output_name, description, owner_deadline, updated_at] = row;
        data[row_key] = {
          output: output_name,
          description,
          ownerDeadline: owner_deadline,
          updatedAt: updated_at
        };
      }
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching commitments:', err);
    res.status(500).json({ error: 'Failed to fetch commitments' });
  }
});

// GET /api/commitments/export - Export all data as structured JSON
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    
    const commitmentsResult = db.exec(`
      SELECT row_key, output_name, description, owner_deadline
      FROM commitments ORDER BY id ASC
    `);
    
    const commentsResult = db.exec(`
      SELECT section_id, text, author, created_at
      FROM comments ORDER BY created_at ASC
    `);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      title: 'FDE Strategic Working Session',
      commitments: [],
      commentsBySection: {}
    };
    
    if (commitmentsResult.length > 0) {
      exportData.commitments = commitmentsResult[0].values.map(row => ({
        output: row[1],
        description: row[2],
        ownerDeadline: row[3]
      }));
    }
    
    if (commentsResult.length > 0) {
      for (const row of commentsResult[0].values) {
        const [section_id, text, author, created_at] = row;
        if (!exportData.commentsBySection[section_id]) {
          exportData.commentsBySection[section_id] = [];
        }
        exportData.commentsBySection[section_id].push({
          text,
          author,
          timestamp: created_at
        });
      }
    }
    
    res.json(exportData);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// PUT /api/commitments/:rowKey - Update owner/deadline for a row
router.put('/:rowKey', async (req, res) => {
  try {
    const { ownerDeadline } = req.body;
    const { rowKey } = req.params;
    
    if (ownerDeadline === undefined) {
      return res.status(400).json({ error: 'ownerDeadline is required' });
    }
    
    const db = await getDatabase();
    
    // Check if exists
    const checkStmt = db.prepare('SELECT id FROM commitments WHERE row_key = ?');
    checkStmt.bind([rowKey]);
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) {
      return res.status(404).json({ error: 'Commitment row not found' });
    }
    
    db.run(`
      UPDATE commitments 
      SET owner_deadline = ?, updated_at = datetime('now')
      WHERE row_key = ?
    `, [ownerDeadline, rowKey]);
    
    scheduleSave();
    
    res.json({ success: true, rowKey, ownerDeadline });
  } catch (err) {
    console.error('Error updating commitment:', err);
    res.status(500).json({ error: 'Failed to update commitment' });
  }
});

export default router;
