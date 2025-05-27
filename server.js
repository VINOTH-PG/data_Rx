const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
     }));
app.use(express.json());

// ✅ MongoDB Connection
const mongoURI = process.env.mongoURI;


mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        setTimeout(() => mongoose.connect(mongoURI), 5000);
    });

mongoose.connection.on('disconnected', () => {
    console.error('⚠ MongoDB disconnected. Reconnecting...');
    setTimeout(() => mongoose.connect(mongoURI), 5000);
});

// ✅ Schemas
const StudentSchema = new mongoose.Schema({
    name: String,
    registerNo: String,
    gender: String,
    mobileNo: String,
    parentMobileNo: String,
    studentYear: String,
    fingerId: Number,
    rfidUID: String
});
const StudentModel = mongoose.model('Student', StudentSchema);

const AttendanceSchema = new mongoose.Schema({
    date: String,
    day: String,
    year: String,
    period: Number,
    subjectCode: String,
    facultyId: String,
    absentRegisterNos: [String],
    timestamp: { type: Date, default: Date.now }
});
const AttendanceModel = mongoose.model('AttendanceData', AttendanceSchema);

const ApprovedODSchema = new mongoose.Schema({
    studentName: String,
    registerNo: String,
    studentYear: String,
    fromDate: Date,
    toDate: Date,
    expireAt: Date
});
const ApprovedODModel = mongoose.model('ApprovedOD', ApprovedODSchema);

const TimeTableSchema = new mongoose.Schema({
    year: String,
    day: String,
    periods: [String]
});
const TimeTableModel = mongoose.model('TimeTable', TimeTableSchema);

const OutStudentSchema = new mongoose.Schema({
    regno: { type: String, required: true, unique: true },
    rfidUID: { type: String, required: true },
    destination: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const OutStudentModel = mongoose.model('OutStudent', OutStudentSchema);

// ✅ Modified Schema with arrivedStatus
const StatusStudentSchema = new mongoose.Schema({
    regno: String,
    rfid: String,
    destination: String,
    timestamp: { type: Date, default: Date.now },
    arrivedStatus: {
        type: String,
        enum: ['arrived', 'late', 'not arrived'],
        default: 'not arrived'
    }
});
const StatusStudentModel = mongoose.model('StudentStatus', StatusStudentSchema);

// ✅ Routes

// Get all students
app.get('/students', async (req, res) => {
    try {
        const students = await StudentModel.find().select('name registerNo studentYear fingerId rfidUID');
        res.json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Server Error' });
    }
});

// Get timetable for year & day
app.get('/timetables', async (req, res) => {
    const { year, day } = req.query;
    if (!year || !day) return res.status(400).json({ message: '❌ year and day required' });

    try {
        const timetable = await TimeTableModel.findOne({ year, day });
        if (timetable) res.json(timetable);
        else res.status(404).json({ message: '❌ Not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Server Error' });
    }
});

app.post('/outstudents', async (req, res) => {
    try {
        const students = req.body;

        if (!Array.isArray(students)) {
            return res.status(400).json({ error: 'Expected an array of students' });
        }

        await OutStudentModel.insertMany(students, { ordered: false });

        res.status(200).json({ message: '✅ Students added successfully' });

    } catch (error) {
        console.error('❌ Error saving students:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ✅ Clean GET route for ESP32
app.get('/outstudents', async (req, res) => {
    try {
        const outStudents = await OutStudentModel.find({}, { regno: 1, rfidUID: 1, _id: 0 });
        res.json(outStudents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Server Error' });
    }
});

// ✅ Attendance route with OD adjustment
app.post('/attendance', async (req, res) => {
    try {
        const { date, day, year, period, subjectCode, facultyId, absentRegisterNos } = req.body;
        if (!date || !day || !absentRegisterNos)
            return res.status(400).json({ message: '❌ Missing required fields' });

        const approvedODs = await ApprovedODModel.find({
            fromDate: { $lte: new Date(date) },
            toDate: { $gte: new Date(date) }
        }).select('registerNo');

        const approvedODRegisterNos = approvedODs.map(od => od.registerNo);
        const modifiedAbsentList = absentRegisterNos.filter(regNo => !approvedODRegisterNos.includes(regNo));

        await new AttendanceModel({
            date, day, year, period, subjectCode, facultyId,
            absentRegisterNos: modifiedAbsentList
        }).save();

        res.status(200).json({
            message: '✅ Attendance recorded after OD adjustment',
            absentRegisterNos: modifiedAbsentList
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Server Error' });
    }
});

// ✅ Arrived students (with arrivedStatus)
app.post('/outstudents/arrived', async (req, res) => {
    const arrived = req.body;
    try {
        const inserts = arrived.map(s => ({
            regno: s.regno,
            rfid: s.rfid,
            destination: s.destination || '',
            arrivedStatus: 'arrived',
            timestamp: new Date()
        }));
        await StatusStudentModel.insertMany(inserts);
        res.status(200).json({ message: '✅ Arrived students saved', count: inserts.length });
    } catch (err) {
        console.error('❌ Error in arrived:', err);
        res.status(500).json({ message: '❌ Server error' });
    }
});

// ✅ Late students (with arrivedStatus)
app.post('/outstudents/late', async (req, res) => {
    const late = req.body;
    try {
        const inserts = late.map(s => ({
            regno: s.regno,
            rfid: s.rfid,
            destination: s.destination || '',
            arrivedStatus: 'late',
            timestamp: new Date()
        }));
        await StatusStudentModel.insertMany(inserts);
        res.status(200).json({ message: '✅ Late students saved', count: inserts.length });
    } catch (err) {
        console.error('❌ Error in late:', err);
        res.status(500).json({ message: '❌ Server error' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${process.env.PORT}`);
});
