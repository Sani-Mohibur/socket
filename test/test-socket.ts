// import { io } from 'socket.io-client';

// const socket = io('http://localhost:5000', {
//   auth: {
//     token:
//       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YTExNjg2YmNkMmNjNDExMDg3NGQ3YiIsInJvbGUiOiJVU0VSIiwiZW1haWwiOiJmYXJhYmlzdW5ueTVAZ21haWwuY29tIiwiaWF0IjoxNzcyMTY1NzgwLCJleHAiOjE3NzQ3NTc3ODB9.FjktuBeD-KRLJzkVeFdw0HxAcDSK1d4F3RgcrEyUY70',
//   },
// });

// socket.on('connect', () => {
//   console.log('✅ Connected to server with ID:', socket.id);

//   // Send a message to a specific receiver (replace with a real User ID)
//   socket.emit('send-message', {
//     receiverId: '69a116aabcd2cc4110874d7e',
//     message: 'How are you?',
//   });
// });

// socket.on('receive-message', (data) => {
//   console.log('📩 Message received:', data);
// });

// socket.on('connect_error', (err) => {
//   console.error('❌ Connection failed:', err.message);
// });
