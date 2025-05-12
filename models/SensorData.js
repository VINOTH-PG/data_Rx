const mongoose = require('mongoose');

// ✅ MongoDB Connection
const mongoURI = 'mongodb+srv://vinothvinoth:vinothvinoth@vinothpg.tojvf.mongodb.net/Example';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Define Student Schema
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

// ✅ Student Data
const students = [
    {
        name: "Vinoth P G",
        registerNo: "710021106311",
        gender: "male",
        mobileNo: "7492076351",
        parentMobileNo: "3609435787",
        studentYear: "year4",
        fingerId: 101,
        rfidUID: ""
    },
    {
        name: "Sasmitha R",
        registerNo: "710021106034",
        gender: "female",
        mobileNo: "6191259726",
        parentMobileNo: "9484272793",
        studentYear: "year4",
        fingerId: 102,
        rfidUID: ""
    },
        {
        name: "Subash S",
        registerNo: "710021106035",
        gender: "male",
        mobileNo: "6191259726",
        parentMobileNo: "9484272793",
        studentYear: "year4",
        fingerId: 102,
        rfidUID: ""
    },
    {
        name: "Mounika A",
        registerNo: "710021106021",
        gender: "female",
        mobileNo: "6897254075",
        parentMobileNo: "1871330304",
        studentYear: "year4",
        fingerId: 103,
        rfidUID: ""
    }
];

// ✅ Insert Students into MongoDB
StudentModel.insertMany(students)
    .then(() => {
        console.log("✅ Students uploaded successfully!");
        mongoose.connection.close();
    })
    .catch(error => {
        console.error("❌ Error uploading students:", error);
    });