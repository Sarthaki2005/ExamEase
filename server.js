require('./db'); // ensures the DB file exists and is seeded on first run

const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/attempts', require('./routes/attempts'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/users', require('./routes/users'));

// Any non-API route falls back to the single-page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ExamEase server running at http://localhost:${PORT}`);
});
