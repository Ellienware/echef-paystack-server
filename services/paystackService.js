const axios = require('axios');

class PayStackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    this.baseURL = 'https://api.paystack.co';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Initialize transaction
  async initializeTransaction(data) {
    try {
      console.log('💰 Initializing PayStack transaction:', data);
      
      const response = await this.axiosInstance.post('/transaction/initialize', {
        email: data.email,
        amount: data.amount, // Amount in kobo
        currency: data.currency || 'ZAR',
        reference: data.reference || `ref_${Date.now()}`,
        subaccount: data.subaccount,
        transaction_charge: data.transaction_charge,
        bearer: data.bearer || 'subaccount',
        metadata: data.metadata,
        callback_url: data.callback_url || `${process.env.API_BASE_URL}/payment/callback`,
      });

      console.log('✅ PayStack transaction initialized:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack transaction initialization failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize transaction');
    }
  }

  // Verify transaction
  async verifyTransaction(reference) {
    try {
      console.log('🔍 Verifying PayStack transaction:', reference);
      
      const response = await this.axiosInstance.get(`/transaction/verify/${reference}`);
      console.log('✅ PayStack transaction verification:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack transaction verification failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify transaction');
    }
  }

  // Create subaccount for chef
  async createSubaccount(data) {
    try {
      console.log('🏦 Creating PayStack subaccount:', data);
      
      const response = await this.axiosInstance.post('/subaccount', {
        business_name: data.business_name,
        settlement_bank: data.settlement_bank,
        account_number: data.account_number,
        percentage_charge: data.percentage_charge || 17, // 17% platform commission
        primary_contact_email: data.primary_contact_email,
        primary_contact_name: data.primary_contact_name,
        settlement_schedule: 'weekly', // Settle to chef weekly
        metadata: data.metadata,
      });

      console.log('✅ PayStack subaccount created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack subaccount creation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create subaccount');
    }
  }

  // Create transfer recipient
  async createTransferRecipient(name, accountNumber, bankCode) {
    try {
      console.log('👤 Creating PayStack transfer recipient:', { name, accountNumber, bankCode });
      
      const response = await this.axiosInstance.post('/transferrecipient', {
        type: 'nuban',
        name: name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'ZAR',
      });

      console.log('✅ PayStack transfer recipient created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack transfer recipient creation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create transfer recipient');
    }
  }

  // Get supported banks
  async getSupportedBanks(currency = 'ZAR') {
    try {
      console.log('🏦 Fetching PayStack supported banks for currency:', currency);
      
      const response = await this.axiosInstance.get('/bank', {
        params: {
          currency: currency,
          country: 'south africa'
        }
      });

      console.log('✅ PayStack banks fetched:', response.data.data.length, 'banks found');
      return response.data.data;
    } catch (error) {
      console.error('❌ PayStack banks fetch failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch supported banks');
    }
  }

  // Verify bank account
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      console.log('🔍 Verifying PayStack bank account:', { accountNumber, bankCode });
      
      const response = await this.axiosInstance.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode
        }
      });

      console.log('✅ PayStack bank account verified:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack bank account verification failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify bank account');
    }
  }

  // Initiate transfer to chef
  async initiateTransfer(recipientCode, amount, reason) {
    try {
      console.log('💸 Initiating PayStack transfer:', { recipientCode, amount, reason });
      
      const response = await this.axiosInstance.post('/transfer', {
        source: 'balance',
        amount: amount, // Amount in kobo
        recipient: recipientCode,
        currency: 'ZAR',
        reason: reason,
      });

      console.log('✅ PayStack transfer initiated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ PayStack transfer initiation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initiate transfer');
    }
  }

  // Get platform balance
  async getPlatformBalance() {
    try {
      console.log('💰 Fetching PayStack platform balance');
      
      const response = await this.axiosInstance.get('/balance');
      console.log('✅ PayStack balance fetched');
      return response.data;
    } catch (error) {
      console.error('❌ PayStack balance fetch failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch platform balance');
    }
  }

  // Verify webhook signature - SKIP FOR HACKATHON
  verifyWebhookSignature(body, signature) {
    // 🎯 FOR HACKATHON: Skip webhook verification
    console.log('🔐 Webhook verification skipped for hackathon demo');
    return true;
  }

  // Get subaccount details
  async getSubaccount(subaccountCode) {
    try {
      console.log('🔍 Fetching PayStack subaccount details:', subaccountCode);
      
      const response = await this.axiosInstance.get(`/subaccount/${subaccountCode}`);
      console.log('✅ PayStack subaccount details fetched');
      return response.data;
    } catch (error) {
      console.error('❌ PayStack subaccount fetch failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch subaccount details');
    }
  }
}

module.exports = new PayStackService();