import express from 'express';
import crypto from 'crypto';
import cors from 'cors';

// --- MOCKS FOR MISSING TYPES ---
// Since @prisma/client is not available in this environment, we mock the necessary types and classes
// to ensure the server code compiles and runs in the demo/simulation context.

enum GiftAidStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

class PrismaClient {
  donation = {
    create: async (args: any) => ({ 
      id: 'mock-donation-id', 
      giftAidToken: args.data.giftAidToken, 
      ...args.data 
    }),
    findUnique: async (args: any) => null, // Simulate not found or mock return if needed
    update: async (args: any) => ({})
  };
  giftAidDeclaration = {
    create: async (args: any) => ({})
  };
  $transaction = async (ops: any[]) => ops;
}

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const SMS_FROM_NAME = process.env.SMS_FROM_NAME || 'CharityApp';
const GIFT_AID_BASE_URL = process.env.GIFT_AID_BASE_URL || 'https://charity.example.com/gift-aid';

// --- SERVICES ---

// SmsService Interface
interface SmsService {
  sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

// Mock SmsService Implementation
class MockSmsService implements SmsService {
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    console.log(`[SMS-MOCK] To: ${phoneNumber} | Body: ${message}`);
    // In production, integrate with Twilio/Vonage here
    return true;
  }
}

// --- APP SETUP ---
const app = express();
const prisma = new PrismaClient();
const smsService: SmsService = new MockSmsService();

// Fix cors type mismatch issue
app.use(cors() as any);
app.use(express.json());

// --- ROUTES ---

// 1. Create Donation (Called by Android App)
app.post('/api/donations', async (req: any, res: any) => {
  try {
    const { amountPence, currency, deviceId, locationId, phoneNumber, paymentId } = req.body;

    // Validation (basic)
    if (!amountPence || !phoneNumber || !paymentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate secure token
    const giftAidToken = crypto.randomBytes(32).toString('hex');

    // Save to DB
    const donation = await prisma.donation.create({
      data: {
        amountPence,
        currency: currency || 'GBP',
        paymentProvider: 'FAKE_PROVIDER',
        paymentId,
        deviceId: deviceId || 'unknown',
        locationId: locationId || 'unknown',
        phoneNumber,
        giftAidToken,
        giftAidStatus: GiftAidStatus.PENDING,
      },
    });

    // Send SMS
    const amountFormatted = (amountPence / 100).toFixed(2);
    const link = `${GIFT_AID_BASE_URL}?token=${giftAidToken}`;
    const smsMessage = `Thanks for donating £${amountFormatted}. Add 25% extra at no cost with Gift Aid: ${link}`;
    
    await smsService.sendSms(phoneNumber, smsMessage);

    res.json({
      donationId: donation.id,
      giftAidToken: donation.giftAidToken, // returned for debugging/demo purposes
      smsSent: true
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get Donation Info for Gift Aid Form (Called by Web Frontend)
app.get('/api/gift-aid/:token', async (req: any, res: any) => {
  try {
    const { token } = req.params;

    const donation = await prisma.donation.findUnique({
      where: { giftAidToken: token },
    });

    if (!donation) {
      return res.status(404).json({ error: 'Link invalid or expired' });
    }

    if (donation.giftAidStatus === GiftAidStatus.COMPLETED) {
      return res.status(409).json({ error: 'Gift Aid already completed' });
    }

    res.json({
      amountPence: donation.amountPence,
      currency: donation.currency,
      charityName: 'Global Relief Fund', // Hardcoded for prototype
      status: donation.giftAidStatus
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Submit Gift Aid Declaration (Called by Web Frontend)
app.post('/api/gift-aid', async (req: any, res: any) => {
  try {
    const {
      token,
      fullName,
      email,
      addressLine1,
      addressLine2,
      city,
      postcode,
      isUkTaxpayer,
      coversPastDonations,
      coversFutureDonations
    } = req.body;

    const donation = await prisma.donation.findUnique({
      where: { giftAidToken: token }
    });

    if (!donation || donation.giftAidStatus !== GiftAidStatus.PENDING) {
      return res.status(400).json({ error: 'Invalid donation reference' });
    }

    // Transaction to update donation and create declaration
    await prisma.$transaction([
      prisma.giftAidDeclaration.create({
        data: {
          donationId: donation.id,
          fullName,
          email,
          addressLine1,
          addressLine2,
          city,
          postcode,
          isUkTaxpayer,
          coversPastDonations: coversPastDonations || false,
          coversFutureDonations: coversFutureDonations || false,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'unknown',
        }
      }),
      prisma.donation.update({
        where: { id: donation.id },
        data: { giftAidStatus: GiftAidStatus.COMPLETED }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save declaration' });
  }
});

// --- START ---
// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;