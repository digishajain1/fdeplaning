import { Router } from 'express';
import { getDatabase, scheduleSave } from '../db/init.js';
import { broadcast } from '../index.js';

const router = Router();

// GET /api/comments - Get all comments grouped by section
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec(`
      SELECT id, section_id, text, author, created_at 
      FROM comments 
      ORDER BY created_at ASC
    `);
    
    // Group by section_id
    const grouped = {};
    if (result.length > 0) {
      const rows = result[0].values;
      for (const row of rows) {
        const [id, section_id, text, author, created_at] = row;
        if (!grouped[section_id]) {
          grouped[section_id] = [];
        }
        grouped[section_id].push({
          id,
          text,
          author,
          ts: new Date(created_at).getTime()
        });
      }
    }
    
    res.json(grouped);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/comments/:sectionId - Get comments for a specific section
router.get('/:sectionId', async (req, res) => {
  try {
    const db = await getDatabase();
    const stmt = db.prepare(`
      SELECT id, text, author, created_at 
      FROM comments 
      WHERE section_id = ?
      ORDER BY created_at ASC
    `);
    stmt.bind([req.params.sectionId]);
    
    const comments = [];
    try {
      while (stmt.step()) {
        const row = stmt.getAsObject();
        comments.push({
          id: row.id,
          text: row.text,
          author: row.author,
          ts: new Date(row.created_at).getTime()
        });
      }
    } finally {
      stmt.free();
    }
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching section comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments - Create a new comment
router.post('/', async (req, res) => {
  try {
    const { sectionId, text, author } = req.body;
    
    if (!sectionId || !text) {
      return res.status(400).json({ error: 'sectionId and text are required' });
    }
    
    const db = await getDatabase();
    const authorVal = (author || '').trim() || 'Anonymous';
    const trimmedText = text.trim();
    
    db.run(`
      INSERT INTO comments (section_id, text, author)
      VALUES (?, ?, ?)
    `, [sectionId, trimmedText, authorVal]);
    
    // Get the inserted row ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    const newId = result[0].values[0][0];
    const now = new Date().toISOString();
    
    scheduleSave();
    
    const newComment = {
      id: newId,
      sectionId,
      text: trimmedText,
      author: authorVal,
      ts: new Date(now).getTime()
    };
    
    // Broadcast to all connected clients
    broadcast('comment:created', newComment);
    
    res.status(201).json({
      id: newId,
      text: trimmedText,
      author: authorVal,
      ts: new Date(now).getTime()
    });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    
    if (isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }
    
    const db = await getDatabase();
    const checkStmt = db.prepare('SELECT id, section_id FROM comments WHERE id = ?');
    checkStmt.bind([commentId]);
    let checkRow = null;
    try {
      const hasRow = checkStmt.step();
      checkRow = hasRow ? checkStmt.getAsObject() : null;
    } finally {
      checkStmt.free();
    }
    if (!checkRow) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const sectionId = checkRow.section_id;
    
    db.run(`DELETE FROM comments WHERE id = ?`, [commentId]);
    scheduleSave();
    
    // Broadcast deletion to all connected clients
    broadcast('comment:deleted', { id: commentId, sectionId });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
