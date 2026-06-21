// Run this ONCE locally to seed your exam_configs collection:
//   node scripts/seed-exams.js
//
// Make sure MONGODB_URI is set in your environment, or hardcode it below temporarily.

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'PASTE_YOUR_MONGODB_URI_HERE';

const ExamConfigSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true, unique: true, uppercase: true },
    label: String,
    emoji: String,
    color: String,
    colorLight: String,
    tagline: String,
    subjects: [String],
    weights: mongoose.Schema.Types.Mixed,
    mockSubjects: [String],
    goalTags: [String],
    examDate: String,
    active: { type: Boolean, default: true },
    order: { type: Number, default: 99 },
  },
  { timestamps: true }
);

const ExamConfig = mongoose.models.ExamConfig || mongoose.model('ExamConfig', ExamConfigSchema);

const GATE_WEIGHTS = {
  'Engineering Maths': 13, 'Discrete Maths': 7, 'Digital Logic': 7,
  'Computer Architecture (CAO)': 7, 'Data Structures': 6.5, 'Algorithms': 6.5,
  'Theory of Computation': 6, 'Compiler Design': 6, 'Operating Systems': 9,
  'DBMS': 9, 'Computer Networks': 9, 'Aptitude & Reasoning': 15,
};

const NET_WEIGHTS = {
  'Teaching Aptitude': 10, 'Research Aptitude': 10, 'Comprehension': 10,
  'Communication': 10, 'Mathematical Reasoning': 10, 'Logical Reasoning': 10,
  'Data Interpretation': 10, 'Information & Communication Technology': 10,
  'People & Environment': 10, 'Higher Education System': 10,
};

const GOVT_WEIGHTS = {
  'General Awareness': 15, 'Quantitative Aptitude': 20, 'Reasoning': 20,
  'English Language': 15, 'Computer Knowledge': 10, 'Current Affairs': 20,
};

const seedData = [
  {
    examId: 'GATE',
    label: 'GATE CS',
    emoji: '🖥️',
    color: '#2563EB',
    colorLight: '#DBEAFE',
    tagline: 'CS 2027',
    subjects: [
      'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Networks',
      'DBMS', 'Discrete Maths', 'Engineering Maths', 'Digital Logic',
      'Computer Architecture (CAO)', 'Compiler Design', 'Theory of Computation',
      'Aptitude & Reasoning',
    ],
    weights: GATE_WEIGHTS,
    mockSubjects: [
      'Full GATE', 'CS Core', 'Mathematics', 'Data Structures', 'Algorithms',
      'Operating Systems', 'Computer Networks', 'DBMS', 'Digital Logic',
      'Computer Architecture (CAO)', 'Compiler Design', 'Theory of Computation',
      'Aptitude & Reasoning',
    ],
    goalTags: ['CS', 'Math', 'CN', 'Test', 'Revision', 'PYQ', 'Other'],
    examDate: '2027-02-01',
    order: 1,
  },
  {
    examId: 'NET',
    label: 'UGC NET',
    emoji: '📖',
    color: '#7C3AED',
    colorLight: '#EDE9FE',
    tagline: 'English 2026',
    subjects: [
      'Teaching Aptitude', 'Research Aptitude', 'Comprehension', 'Communication',
      'Mathematical Reasoning', 'Logical Reasoning', 'Data Interpretation',
      'Information & Communication Technology', 'People & Environment',
      'Higher Education System', 'British Poetry', 'British Prose & Fiction',
      'British Drama', 'American Literature', 'Indian Writing in English',
      'Literary Criticism & Theory', 'Language & Linguistics',
      'Cultural Studies & New Literatures',
    ],
    weights: NET_WEIGHTS,
    mockSubjects: [
      'Full NET', 'Paper 1 (General)', 'Paper 2 (English)',
      'Teaching & Research Aptitude', 'Logical Reasoning', 'British Literature',
      'American Literature', 'Indian Writing in English',
      'Literary Theory & Criticism', 'Language & Linguistics',
    ],
    goalTags: ['Paper1', 'Paper2', 'Revision', 'Test', 'Reading', 'Writing', 'Other'],
    examDate: '2026-06-15',
    order: 2,
  },
  {
    examId: 'GOVT',
    label: 'Govt Jobs',
    emoji: '🏛️',
    color: '#16A34A',
    colorLight: '#DCFCE7',
    tagline: 'SSC/Banking 2026',
    subjects: [
      'General Awareness', 'Quantitative Aptitude', 'Reasoning',
      'English Language', 'Computer Knowledge', 'Current Affairs',
    ],
    weights: GOVT_WEIGHTS,
    mockSubjects: ['Full Mock', 'Quant', 'Reasoning', 'English', 'GK & Current Affairs'],
    goalTags: ['Quant', 'Reasoning', 'English', 'GK', 'Test', 'Revision', 'Other'],
    examDate: '2026-12-01',
    order: 3,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const exam of seedData) {
    await ExamConfig.findOneAndUpdate(
      { examId: exam.examId },
      { $set: exam },
      { upsert: true, new: true }
    );
    console.log(`Upserted: ${exam.examId}`);
  }

  console.log('Seeding complete!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
