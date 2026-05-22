const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Use test database
process.env.MONGO_URI = 'mongodb://localhost:27017/projectmanagement_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.EMAIL_USER = 'test@gmail.com';
process.env.EMAIL_PASS = 'testpass';

// Mock nodemailer so no real emails are sent during tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});