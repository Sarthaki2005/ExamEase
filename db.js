
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'examease.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','faculty','admin')),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('MCQ','TF','Descriptive')),
  text TEXT NOT NULL,
  options TEXT,
  correct_index INTEGER,
  marks REAL NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  duration INTEGER NOT NULL,
  total_marks REAL NOT NULL DEFAULT 0,
  passing_percent REAL NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  schedule TEXT,
  randomize INTEGER NOT NULL DEFAULT 0,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  PRIMARY KEY (exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TEXT,
  submitted_at TEXT,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  camera_enabled INTEGER NOT NULL DEFAULT 0,
  last_warning TEXT,
  last_activity_at TEXT,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response TEXT,
  is_correct INTEGER,
  marks_awarded REAL,
  feedback TEXT
);
`);

// ============================================================
// MIGRATIONS
// ============================================================

function ensureColumn(table, column, ddl) {
  const cols = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);

  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn('attempts', 'started_at', 'started_at TEXT');

ensureColumn(
  'attempts',
  'tab_switch_count',
  'tab_switch_count INTEGER NOT NULL DEFAULT 0'
);

ensureColumn(
  'attempts',
  'camera_enabled',
  'camera_enabled INTEGER NOT NULL DEFAULT 0'
);

ensureColumn('attempts', 'last_warning', 'last_warning TEXT');

ensureColumn(
  'attempts',
  'last_activity_at',
  'last_activity_at TEXT'
);

ensureColumn('attempts', 'question_order', 'question_order TEXT');

// Required by the answer autosave/submit API.
// Remove accidental duplicates from older databases, then enforce
// one answer per question in each attempt.
db.exec(`
  DELETE FROM answers
  WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM answers
    GROUP BY attempt_id, question_id
  );

  CREATE UNIQUE INDEX IF NOT EXISTS
  idx_answers_attempt_question
  ON answers(attempt_id, question_id);
`);


// ============================================================
// ORIGINAL SEED DATA
// ============================================================

function seed() {
  const hash = bcrypt.hashSync('demo1234', 10);

  const insertUser = db.prepare(`
    INSERT INTO users
    (id,name,username,password_hash,role,status)
    VALUES (?,?,?,?,?,?)
  `);

  // Original users

  insertUser.run(
    'S-88219',
    'Alex Johnson',
    'alex.johnson',
    hash,
    'student',
    'active'
  );

  insertUser.run(
    'S-88220',
    'Priya Nair',
    'priya.nair',
    hash,
    'student',
    'active'
  );

  insertUser.run(
    'F-10042',
    'Prof. R. Mehta',
    'r.mehta',
    hash,
    'faculty',
    'active'
  );

  insertUser.run(
    'A-00001',
    'System Admin',
    'admin',
    hash,
    'admin',
    'active'
  );


  // ==========================================================
  // ORIGINAL QUESTIONS
  // ==========================================================

  const insertQ = db.prepare(`
    INSERT INTO questions
    (id,subject,type,text,options,correct_index,marks,created_by)
    VALUES (?,?,?,?,?,?,?,?)
  `);

  insertQ.run(
    'Q1',
    'Mathematics',
    'MCQ',
    'Solve for x: 2x + 5 = 15',
    JSON.stringify(['x = 5', 'x = 10', 'x = 2', 'x = 7']),
    0,
    5,
    'F-10042'
  );

  insertQ.run(
    'Q2',
    'Mathematics',
    'MCQ',
    'What is the value of π rounded to two decimal places?',
    JSON.stringify(['3.14', '3.41', '3.12', '3.16']),
    0,
    5,
    'F-10042'
  );

  insertQ.run(
    'Q3',
    'Mathematics',
    'TF',
    'The square root of 144 is 12.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10042'
  );

  insertQ.run(
    'Q4',
    'Mathematics',
    'MCQ',
    'Which of these is a prime number?',
    JSON.stringify(['21', '31', '27', '33']),
    1,
    5,
    'F-10042'
  );

  insertQ.run(
    'Q5',
    'Mathematics',
    'Descriptive',
    'Explain the steps to solve a quadratic equation using the quadratic formula.',
    null,
    null,
    10,
    'F-10042'
  );

  insertQ.run(
    'Q6',
    'Data Structures',
    'MCQ',
    'Which data structure follows LIFO order?',
    JSON.stringify(['Queue', 'Stack', 'Array', 'Linked List']),
    1,
    5,
    'F-10042'
  );

  insertQ.run(
    'Q7',
    'Data Structures',
    'Descriptive',
    'Describe the difference between a stack and a queue with a real-world example.',
    null,
    null,
    10,
    'F-10042'
  );


  // ==========================================================
  // ORIGINAL EXAMS
  // ==========================================================

  const insertE = db.prepare(`
    INSERT INTO exams
    (id,title,subject,duration,total_marks,passing_percent,
     status,schedule,randomize,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  insertE.run(
    'E1',
    'Final Examination',
    'Mathematics',
    15,
    20,
    40,
    'Active',
    'Today · 10:00 AM',
    1,
    'F-10042'
  );

  insertE.run(
    'E2',
    'Data Structures Midterm',
    'Data Structures',
    30,
    15,
    40,
    'Scheduled',
    '20 Aug 2026 · 2:00 PM',
    0,
    'F-10042'
  );

  const insertEQ = db.prepare(
    'INSERT INTO exam_questions (exam_id, question_id) VALUES (?,?)'
  );

  ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
    insertEQ.run('E1', q);
  });

  ['Q6', 'Q7'].forEach((q) => {
    insertEQ.run('E2', q);
  });

  console.log('Seeded original ExamEase data.');
}


// ============================================================
// ADD 50 STUDENTS + 10 FACULTY + 50 QUESTIONS
// ============================================================

function seedAdditionalData() {

  const hash = bcrypt.hashSync('demo1234', 10);

  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
    (id,name,username,password_hash,role,status)
    VALUES (?,?,?,?,?,?)
  `);


  // ==========================================================
  // 50 STUDENTS
  // ==========================================================

  const students = [
    ['S-10001', 'Aarav Sharma', 'aarav.sharma'],
    ['S-10002', 'Ananya Reddy', 'ananya.reddy'],
    ['S-10003', 'Arjun Kumar', 'arjun.kumar'],
    ['S-10004', 'Diya Nair', 'diya.nair'],
    ['S-10005', 'Rahul Verma', 'rahul.verma'],
    ['S-10006', 'Sneha Patel', 'sneha.patel'],
    ['S-10007', 'Karthik Rao', 'karthik.rao'],
    ['S-10008', 'Meera Iyer', 'meera.iyer'],
    ['S-10009', 'Rohan Gupta', 'rohan.gupta'],
    ['S-10010', 'Ishita Singh', 'ishita.singh'],

    ['S-10011', 'Aditya Das', 'aditya.das'],
    ['S-10012', 'Pooja Menon', 'pooja.menon'],
    ['S-10013', 'Vikram Reddy', 'vikram.reddy'],
    ['S-10014', 'Kavya Sharma', 'kavya.sharma'],
    ['S-10015', 'Nikhil Jain', 'nikhil.jain'],
    ['S-10016', 'Sanjana Rao', 'sanjana.rao'],
    ['S-10017', 'Varun Kumar', 'varun.kumar'],
    ['S-10018', 'Aditi Nair', 'aditi.nair'],
    ['S-10019', 'Manish Patel', 'manish.patel'],
    ['S-10020', 'Keerthi Reddy', 'keerthi.reddy'],

    ['S-10021', 'Harsh Gupta', 'harsh.gupta'],
    ['S-10022', 'Neha Singh', 'neha.singh'],
    ['S-10023', 'Siddharth Das', 'siddharth.das'],
    ['S-10024', 'Lavanya Menon', 'lavanya.menon'],
    ['S-10025', 'Akash Iyer', 'akash.iyer'],
    ['S-10026', 'Nandini Rao', 'nandini.rao'],
    ['S-10027', 'Ritesh Kumar', 'ritesh.kumar'],
    ['S-10028', 'Divya Sharma', 'divya.sharma'],
    ['S-10029', 'Abhinav Patel', 'abhinav.patel'],
    ['S-10030', 'Swathi Reddy', 'swathi.reddy'],

    ['S-10031', 'Yash Verma', 'yash.verma'],
    ['S-10032', 'Priyanka Gupta', 'priyanka.gupta'],
    ['S-10033', 'Tejas Singh', 'tejas.singh'],
    ['S-10034', 'Bhavana Nair', 'bhavana.nair'],
    ['S-10035', 'Suresh Rao', 'suresh.rao'],
    ['S-10036', 'Anjali Das', 'anjali.das'],
    ['S-10037', 'Ravi Kumar', 'ravi.kumar'],
    ['S-10038', 'Harini Menon', 'harini.menon'],
    ['S-10039', 'Mohit Jain', 'mohit.jain'],
    ['S-10040', 'Pallavi Iyer', 'pallavi.iyer'],

    ['S-10041', 'Gautham Reddy', 'gautham.reddy'],
    ['S-10042', 'Shreya Patel', 'shreya.patel'],
    ['S-10043', 'Abhishek Rao', 'abhishek.rao'],
    ['S-10044', 'Mounika Sharma', 'mounika.sharma'],
    ['S-10045', 'Tarun Gupta', 'tarun.gupta'],
    ['S-10046', 'Sravya Singh', 'sravya.singh'],
    ['S-10047', 'Naveen Das', 'naveen.das'],
    ['S-10048', 'Reshma Nair', 'reshma.nair'],
    ['S-10049', 'Chaitanya Kumar', 'chaitanya.kumar'],
    ['S-10050', 'Sowmya Reddy', 'sowmya.reddy']
  ];

  students.forEach(([id, name, username]) => {
    insertUser.run(
      id,
      name,
      username,
      hash,
      'student',
      'active'
    );
  });


  // ==========================================================
  // 10 FACULTY
  // ==========================================================

  const faculty = [
    ['F-10043', 'Dr. Anil Sharma', 'anil.sharma'],
    ['F-10044', 'Prof. Kavitha Rao', 'kavitha.rao'],
    ['F-10045', 'Dr. Suresh Kumar', 'suresh.kumar'],
    ['F-10046', 'Prof. Meena Nair', 'meena.nair'],
    ['F-10047', 'Dr. Rajesh Gupta', 'rajesh.gupta'],
    ['F-10048', 'Prof. Priya Menon', 'priya.menon'],
    ['F-10049', 'Dr. Arvind Patel', 'arvind.patel'],
    ['F-10050', 'Prof. Lakshmi Reddy', 'lakshmi.reddy'],
    ['F-10051', 'Dr. Vivek Singh', 'vivek.singh'],
    ['F-10052', 'Prof. Swathi Iyer', 'swathi.iyer']
  ];

  faculty.forEach(([id, name, username]) => {
    insertUser.run(
      id,
      name,
      username,
      hash,
      'faculty',
      'active'
    );
  });


  // ==========================================================
  // QUESTIONS
  // ==========================================================

  const insertQ = db.prepare(`
    INSERT OR IGNORE INTO questions
    (id,subject,type,text,options,correct_index,marks,created_by)
    VALUES (?,?,?,?,?,?,?,?)
  `);


  // ==========================================================
  // MATHEMATICS - 10 QUESTIONS
  // ==========================================================

  insertQ.run(
    'Q101',
    'Mathematics',
    'MCQ',
    'What is the derivative of x²?',
    JSON.stringify(['x', '2x', 'x²', '2']),
    1,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q102',
    'Mathematics',
    'MCQ',
    'What is the integral of 2x dx?',
    JSON.stringify(['x² + C', '2x² + C', 'x + C', '2 + C']),
    0,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q103',
    'Mathematics',
    'MCQ',
    'What is the value of 5 factorial?',
    JSON.stringify(['20', '60', '100', '120']),
    3,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q104',
    'Mathematics',
    'MCQ',
    'Which of the following is an irrational number?',
    JSON.stringify(['4', '9/2', '√2', '0.5']),
    2,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q105',
    'Mathematics',
    'MCQ',
    'What is the determinant of [[1,2],[3,4]]?',
    JSON.stringify(['-2', '2', '10', '4']),
    0,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q106',
    'Mathematics',
    'TF',
    'Every square matrix has a determinant.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q107',
    'Mathematics',
    'TF',
    'The sum of the angles in a triangle is 180 degrees.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q108',
    'Mathematics',
    'MCQ',
    'If log10(x) = 2, what is x?',
    JSON.stringify(['10', '20', '100', '1000']),
    2,
    5,
    'F-10043'
  );

  insertQ.run(
    'Q109',
    'Mathematics',
    'Descriptive',
    'Explain the concept of differentiation and describe two real-world applications of derivatives.',
    null,
    null,
    10,
    'F-10043'
  );

  insertQ.run(
    'Q110',
    'Mathematics',
    'Descriptive',
    'Explain how matrices are used to solve systems of linear equations. Include a suitable example.',
    null,
    null,
    10,
    'F-10043'
  );


  // ==========================================================
  // DATA STRUCTURES - 10 QUESTIONS
  // ==========================================================

  insertQ.run(
    'Q111',
    'Data Structures',
    'MCQ',
    'Which data structure uses FIFO ordering?',
    JSON.stringify(['Stack', 'Queue', 'Tree', 'Graph']),
    1,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q112',
    'Data Structures',
    'MCQ',
    'What is the average time complexity of searching in a balanced binary search tree?',
    JSON.stringify(['O(1)', 'O(log n)', 'O(n)', 'O(n²)']),
    1,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q113',
    'Data Structures',
    'MCQ',
    'Which data structure is commonly used to implement recursion?',
    JSON.stringify(['Queue', 'Stack', 'Heap', 'Graph']),
    1,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q114',
    'Data Structures',
    'MCQ',
    'Which traversal visits Root, Left, Right?',
    JSON.stringify(['Inorder', 'Preorder', 'Postorder', 'Level order']),
    1,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q115',
    'Data Structures',
    'MCQ',
    'Which data structure is best suited for priority-based processing?',
    JSON.stringify(['Stack', 'Queue', 'Heap', 'Array']),
    2,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q116',
    'Data Structures',
    'TF',
    'A stack follows the Last-In-First-Out principle.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q117',
    'Data Structures',
    'TF',
    'A linked list requires contiguous memory locations.',
    JSON.stringify(['True', 'False']),
    1,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q118',
    'Data Structures',
    'MCQ',
    'Which structure represents hierarchical relationships?',
    JSON.stringify(['Array', 'Stack', 'Tree', 'Queue']),
    2,
    5,
    'F-10044'
  );

  insertQ.run(
    'Q119',
    'Data Structures',
    'Descriptive',
    'Compare arrays and linked lists. Discuss their advantages, disadvantages, and suitable applications.',
    null,
    null,
    10,
    'F-10044'
  );

  insertQ.run(
    'Q120',
    'Data Structures',
    'Descriptive',
    'Explain binary search trees and describe how insertion and searching are performed.',
    null,
    null,
    10,
    'F-10044'
  );


  // ==========================================================
  // DBMS - 10 QUESTIONS
  // ==========================================================

  insertQ.run(
    'Q121',
    'DBMS',
    'MCQ',
    'Which SQL command is used to retrieve data?',
    JSON.stringify(['INSERT', 'SELECT', 'UPDATE', 'DELETE']),
    1,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q122',
    'DBMS',
    'MCQ',
    'Which key uniquely identifies a record?',
    JSON.stringify(['Foreign Key', 'Primary Key', 'Candidate Key', 'Composite Key']),
    1,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q123',
    'DBMS',
    'MCQ',
    'Which normal form removes partial dependency?',
    JSON.stringify(['1NF', '2NF', '3NF', 'BCNF']),
    1,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q124',
    'DBMS',
    'MCQ',
    'Which SQL command removes a table completely?',
    JSON.stringify(['DELETE', 'REMOVE', 'DROP', 'CLEAR']),
    2,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q125',
    'DBMS',
    'MCQ',
    'What does SQL stand for?',
    JSON.stringify([
      'Structured Query Language',
      'Simple Query Language',
      'Sequential Query Language',
      'System Query Language'
    ]),
    0,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q126',
    'DBMS',
    'TF',
    'A foreign key can reference a primary key in another table.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q127',
    'DBMS',
    'TF',
    'Normalization is used to reduce data redundancy.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q128',
    'DBMS',
    'MCQ',
    'Which ACID property ensures that a transaction is treated as one unit?',
    JSON.stringify(['Consistency', 'Isolation', 'Atomicity', 'Durability']),
    2,
    5,
    'F-10045'
  );

  insertQ.run(
    'Q129',
    'DBMS',
    'Descriptive',
    'Explain database normalization up to Third Normal Form with a suitable example.',
    null,
    null,
    10,
    'F-10045'
  );

  insertQ.run(
    'Q130',
    'DBMS',
    'Descriptive',
    'Explain ACID properties of database transactions and why they are important.',
    null,
    null,
    10,
    'F-10045'
  );


  // ==========================================================
  // OPERATING SYSTEMS - 10 QUESTIONS
  // ==========================================================

  insertQ.run(
    'Q131',
    'Operating Systems',
    'MCQ',
    'Which component manages hardware resources?',
    JSON.stringify(['Compiler', 'Operating System', 'Database', 'Browser']),
    1,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q132',
    'Operating Systems',
    'MCQ',
    'Which scheduling algorithm uses a time quantum?',
    JSON.stringify(['FCFS', 'SJF', 'Round Robin', 'Priority']),
    2,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q133',
    'Operating Systems',
    'MCQ',
    'Which of the following can cause deadlock?',
    JSON.stringify([
      'Mutual exclusion',
      'Circular wait',
      'Hold and wait',
      'All of the above'
    ]),
    3,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q134',
    'Operating Systems',
    'MCQ',
    'Which memory management technique uses fixed-size blocks?',
    JSON.stringify(['Paging', 'Segmentation', 'Compaction', 'Swapping']),
    0,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q135',
    'Operating Systems',
    'MCQ',
    'What is a process?',
    JSON.stringify([
      'A program stored on disk',
      'A program in execution',
      'A compiler',
      'A hardware device'
    ]),
    1,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q136',
    'Operating Systems',
    'TF',
    'A process can have multiple threads.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q137',
    'Operating Systems',
    'TF',
    'Deadlock can occur when processes wait indefinitely for resources.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q138',
    'Operating Systems',
    'MCQ',
    'Which page replacement algorithm removes the page that has not been used for the longest time?',
    JSON.stringify(['FIFO', 'LRU', 'Optimal', 'Random']),
    1,
    5,
    'F-10046'
  );

  insertQ.run(
    'Q139',
    'Operating Systems',
    'Descriptive',
    'Explain process scheduling and compare FCFS, SJF, and Round Robin scheduling algorithms.',
    null,
    null,
    10,
    'F-10046'
  );

  insertQ.run(
    'Q140',
    'Operating Systems',
    'Descriptive',
    'Explain deadlock, its four necessary conditions, and two methods for handling deadlocks.',
    null,
    null,
    10,
    'F-10046'
  );


  // ==========================================================
  // COMPUTER NETWORKS - 10 QUESTIONS
  // ==========================================================

  insertQ.run(
    'Q141',
    'Computer Networks',
    'MCQ',
    'Which protocol is used for transferring web pages?',
    JSON.stringify(['FTP', 'HTTP', 'SMTP', 'SSH']),
    1,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q142',
    'Computer Networks',
    'MCQ',
    'Which device forwards packets between different networks?',
    JSON.stringify(['Switch', 'Hub', 'Router', 'Repeater']),
    2,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q143',
    'Computer Networks',
    'MCQ',
    'Which layer of the OSI model is responsible for routing?',
    JSON.stringify(['Transport', 'Network', 'Session', 'Data Link']),
    1,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q144',
    'Computer Networks',
    'MCQ',
    'Which protocol is connection-oriented?',
    JSON.stringify(['UDP', 'IP', 'TCP', 'ARP']),
    2,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q145',
    'Computer Networks',
    'MCQ',
    'What does DNS primarily do?',
    JSON.stringify([
      'Encrypt data',
      'Translate domain names into IP addresses',
      'Transfer files',
      'Compress packets'
    ]),
    1,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q146',
    'Computer Networks',
    'TF',
    'TCP provides reliable data delivery.',
    JSON.stringify(['True', 'False']),
    0,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q147',
    'Computer Networks',
    'TF',
    'UDP guarantees delivery of every packet.',
    JSON.stringify(['True', 'False']),
    1,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q148',
    'Computer Networks',
    'MCQ',
    'Which address identifies a network interface at the data-link layer?',
    JSON.stringify([
      'IP address',
      'Port number',
      'MAC address',
      'URL'
    ]),
    2,
    5,
    'F-10047'
  );

  insertQ.run(
    'Q149',
    'Computer Networks',
    'Descriptive',
    'Explain the OSI reference model and describe the function of each of its seven layers.',
    null,
    null,
    10,
    'F-10047'
  );

  insertQ.run(
    'Q150',
    'Computer Networks',
    'Descriptive',
    'Compare TCP and UDP. Discuss their characteristics and suitable applications.',
    null,
    null,
    10,
    'F-10047'
  );


  console.log(
    'Added 50 students, 10 faculty, and 50 additional questions.'
  );
}


// ============================================================
// RUN INITIAL SEED ONLY IF DATABASE IS EMPTY
// ============================================================

const userCount = db
  .prepare('SELECT COUNT(*) AS c FROM users')
  .get().c;

if (userCount === 0) {
  seed();
}


// ============================================================
// RUN ADDITIONAL DATA
// ============================================================

seedAdditionalData();


// ============================================================
// EXPORT DATABASE
// ============================================================

module.exports = { db };