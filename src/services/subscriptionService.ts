import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export async function createCheckoutSession(userId: string, priceId: string, planName: string) {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, priceId, planName }),
    });

    const session = await response.json();

    if (session.error) {
      throw new Error(session.error);
    }

    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to load');

    const { error } = await (stripe as any).redirectToCheckout({
      sessionId: session.id,
    });

    if (error) {
      console.error('Stripe Redirect Error:', error);
    }
  } catch (error) {
    console.error('Subscription Error:', error);
    throw error;
  }
}
