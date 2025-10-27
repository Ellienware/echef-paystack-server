const express = require('express');
const router = express.Router();
const paystackService = require('../services/paystackService');

// Initialize PayStack transaction
router.post('/initialize-transaction', async (req, res) => {
  try {
    const { amount, email, subaccount, transaction_charge, metadata, currency = 'ZAR' } = req.body;
    
    if (!amount || !email) {
      return res.status(400).json({
        success: false,
        error: 'Amount and email are required'
      });
    }

    const result = await paystackService.initializeTransaction({
      email,
      amount: Math.round(amount * 100), // Convert to kobo
      currency,
      subaccount,
      transaction_charge: transaction_charge ? Math.round(transaction_charge * 100) : undefined,
      metadata,
      callback_url: `${process.env.API_BASE_URL}/payment/callback`
    });

    res.json({
      success: true,
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      access_code: result.data.access_code
    });
  } catch (error) {
    console.error('PayStack initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initialize transaction' 
    });
  }
});

// Verify transaction
router.get('/verify-transaction/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference is required'
      });
    }

    const result = await paystackService.verifyTransaction(reference);
    
    res.json({
      success: result.status,
      data: result.data
    });
  } catch (error) {
    console.error('PayStack verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to verify transaction' 
    });
  }
});

// Create subaccount for chef
router.post('/create-subaccount', async (req, res) => {
  try {
    const { email, name, chefId, bank_code, account_number, percentage_charge = 17 } = req.body;
    
    if (!email || !name || !bank_code || !account_number) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, bank_code, and account_number are required'
      });
    }

    const result = await paystackService.createSubaccount({
      business_name: name,
      settlement_bank: bank_code,
      account_number: account_number,
      percentage_charge: percentage_charge,
      primary_contact_email: email,
      primary_contact_name: name,
      metadata: {
        chefId: chefId,
        type: 'chef'
      }
    });

    res.json({
      success: true,
      subaccountCode: result.data.subaccount_code,
      account_number: result.data.account_number,
      bank_name: result.data.settlement_bank
    });
  } catch (error) {
    console.error('PayStack subaccount creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create subaccount' 
    });
  }
});

// Create transfer recipient
router.post('/create-recipient', async (req, res) => {
  try {
    const { type, name, account_number, bank_code, currency = 'ZAR', metadata } = req.body;
    
    if (!name || !account_number || !bank_code) {
      return res.status(400).json({
        success: false,
        error: 'Name, account_number, and bank_code are required'
      });
    }

    const result = await paystackService.createTransferRecipient(
      name,
      account_number,
      bank_code
    );

    res.json({
      success: true,
      recipient_code: result.data.recipient_code,
      account_number: result.data.details.account_number,
      bank_name: result.data.details.bank_name
    });
  } catch (error) {
    console.error('PayStack recipient creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create transfer recipient' 
    });
  }
});

// Get supported banks
router.get('/banks', async (req, res) => {
  try {
    const { currency = 'ZAR' } = req.query;
    
    const banks = await paystackService.getSupportedBanks(currency);
    
    res.json({ 
      success: true,
      banks: banks.map(bank => ({
        code: bank.code,
        name: bank.name
      }))
    });
  } catch (error) {
    console.error('PayStack banks error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch banks' 
    });
  }
});

// Verify bank account
router.post('/verify-account', async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;
    
    if (!account_number || !bank_code) {
      return res.status(400).json({
        success: false,
        error: 'Account_number and bank_code are required'
      });
    }

    const result = await paystackService.verifyBankAccount(account_number, bank_code);
    
    res.json({
      success: true,
      verified: true,
      account_name: result.data.account_name,
      account_number: result.data.account_number
    });
  } catch (error) {
    console.error('PayStack account verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to verify bank account' 
    });
  }
});

// Initiate transfer to chef
router.post('/initiate-transfer', async (req, res) => {
  try {
    const { source, amount, recipient, currency = 'ZAR', reason } = req.body;
    
    if (!amount || !recipient) {
      return res.status(400).json({
        success: false,
        error: 'Amount and recipient are required'
      });
    }

    const result = await paystackService.initiateTransfer(
      recipient,
      Math.round(amount * 100), // Convert to kobo
      reason
    );

    res.json({
      success: true,
      transferCode: result.data.transfer_code,
      reference: result.data.reference,
      status: result.data.status
    });
  } catch (error) {
    console.error('PayStack transfer error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initiate transfer' 
    });
  }
});

// Get platform balance
router.get('/balance', async (req, res) => {
  try {
    const result = await paystackService.getPlatformBalance();
    
    res.json({
      success: true,
      balance: result.data
    });
  } catch (error) {
    console.error('PayStack balance error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch balance' 
    });
  }
});

// Get subaccount details
router.get('/subaccount/:subaccountCode', async (req, res) => {
  try {
    const { subaccountCode } = req.params;
    
    const result = await paystackService.getSubaccount(subaccountCode);
    
    res.json({
      success: true,
      subaccount: result.data
    });
  } catch (error) {
    console.error('PayStack subaccount fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch subaccount details' 
    });
  }
});

module.exports = router;