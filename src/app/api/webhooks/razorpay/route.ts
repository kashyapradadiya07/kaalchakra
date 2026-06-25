import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { upsertSubscription, Subscription } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Signature Verification (if secret is configured in production)
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error('Invalid Razorpay Webhook Signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;
    console.log(`Razorpay Webhook Received Event: ${event}`);

    // Parse subscription details
    const subscriptionEntity = payload.payload?.subscription?.entity;
    if (!subscriptionEntity) {
      console.warn('No subscription entity in webhook payload');
      return NextResponse.json({ message: 'Ignored: No subscription entity' }, { status: 200 });
    }

    // Extract note metadata containing our User ID
    const userId = subscriptionEntity.notes?.user_id;
    if (!userId) {
      console.error('Missing user_id in Razorpay subscription notes metadata');
      return NextResponse.json({ error: 'Missing user_id metadata' }, { status: 400 });
    }

    const planId = subscriptionEntity.plan_id || 'pro_monthly';
    const razorpaySubId = subscriptionEntity.id;
    const currentEndUnix = subscriptionEntity.current_end; // Unix timestamp
    const currentPeriodEnd = new Date(currentEndUnix * 1000).toISOString();
    
    // Map Razorpay statuses to standard states
    // Razorpay statuses: authenticated, active, pending, halted, cancelled, completed, expired
    let status = 'inactive';
    if (subscriptionEntity.status === 'active' || subscriptionEntity.status === 'authenticated') {
      status = 'active';
    } else if (subscriptionEntity.status === 'cancelled') {
      status = 'cancelled';
    } else if (subscriptionEntity.status === 'expired') {
      status = 'expired';
    }

    // Webhook event matching updates
    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged':
        status = 'active';
        break;
      case 'subscription.cancelled':
        status = 'cancelled';
        break;
      case 'subscription.completed':
      case 'subscription.expired':
        status = 'expired';
        break;
      default:
        console.log(`Unhandled subscription event: ${event}`);
    }

    const subscriptionRecord: Subscription = {
      id: crypto.randomUUID(),
      user_id: userId,
      plan_id: planId,
      status,
      razorpay_subscription_id: razorpaySubId,
      current_period_end: currentPeriodEnd
    };

    console.log(`Updating user ${userId} subscription status to ${status}. Expiry: ${currentPeriodEnd}`);
    await upsertSubscription(subscriptionRecord);

    return NextResponse.json({ success: true, event, status });
  } catch (error: any) {
    console.error('Error processing Razorpay Webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
