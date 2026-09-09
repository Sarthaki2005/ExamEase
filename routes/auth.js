const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  if (user.status !== 'active') return res.status(403).json({ error: 'This account has been suspended' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, username: user.username },
    SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, username: user.username } });
});

module.exports = router;
