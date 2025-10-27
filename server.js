const express = require('express');
const cors = require('cors');
const { Client, Databases, Storage, Query, ID } = require('node-appwrite');
const paystackService = require('./services/paystackService');
require('dotenv').config();

const app = express();

// CORS configuration for all origins during hackathon
app.use(cors({
  origin: '*', // Allow all for demo
  credentials: true
}));

app.use(express.json());

// Initialize Appwrite client - USE UPDATED VARIABLE NAMES
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// Import PayStack routes
const paystackRoutes = require('./routes/paystack');
app.use('/api/paystack', paystackRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiUrl: process.env.API_BASE_URL,
    // Add Appwrite config info for debugging
    appwrite: {
      endpoint: process.env.APPWRITE_ENDPOINT ? 'set' : 'missing',
      projectId: process.env.APPWRITE_PROJECT_ID ? 'set' : 'missing',
      databaseId: process.env.APPWRITE_DATABASE_ID ? 'set' : 'missing',
      apiKey: process.env.APPWRITE_API_KEY ? 'set' : 'missing'
    }
  });
});

// Test endpoint to verify PayStack keys
app.get('/api/test-paystack', async (req, res) => {
  try {
    // Test PayStack connection by getting banks (simpler than balance)
    const banks = await paystackService.getSupportedBanks();
    res.json({
      success: true,
      message: 'PayStack connection successful',
      banksCount: banks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'PayStack connection failed: ' + error.message
    });
  }
});

// Webhook handler for PayStack events
app.post('/api/webhooks/paystack', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = req.body;

    console.log('📩 PayStack webhook received:', body.event);

    // For hackathon, skip webhook verification
    console.log('🔐 Webhook verification skipped for hackathon');
    
    const event = body.event;
    const data = body.data;

    if (event === 'charge.success') {
      // Handle successful payment
      const reference = data.reference;
      console.log('✅ Payment successful for reference:', reference);
      
      // Update booking or event registration status based on metadata
      if (data.metadata) {
        const { bookingId, eventId, type } = data.metadata;
        
        if (type === 'booking' && bookingId) {
          // Update booking payment status
          await databases.updateDocument(
            DATABASE_ID,
            'bookings',
            bookingId,
            {
              paymentStatus: 'paid',
              transactionId: data.id,
              status: 'confirmed',
              updatedAt: new Date().toISOString()
            }
          );
          console.log('✅ Booking payment confirmed:', bookingId);
        }
        
        if (type === 'event_booking' && eventId) {
          // Update event attendee payment status
          const attendees = await databases.listDocuments(
            DATABASE_ID,
            'event_attendees',
            [Query.equal('paymentReference', reference)]
          );
          
          if (attendees.documents.length > 0) {
            const attendee = attendees.documents[0];
            await databases.updateDocument(
              DATABASE_ID,
              'event_attendees',
              attendee.$id,
              {
                paymentStatus: 'paid',
                transactionId: data.id,
                updatedAt: new Date().toISOString()
              }
            );
            console.log('✅ Event registration payment confirmed:', eventId);
          }
        }
      }
    } else if (event === 'transfer.success') {
      // Handle successful transfer to chef
      console.log('✅ Transfer successful to chef:', data.recipient.recipient_code);
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// 404 handler - FIXED: Remove the path
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`💰 PayStack integration ready`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});