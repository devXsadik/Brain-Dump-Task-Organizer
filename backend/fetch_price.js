import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51TnOuo3oNycTh9C0iGn9AgGhLF2vidBTzE6rzYdIe6gZIpBqm86eaqVyC0D1tpD484V0uQQqYgV0jTp3MZOwB3zb00HmuLR83d');

async function getPrice() {
  const prices = await stripe.prices.list({
    product: 'prod_Umz0OFAThFrQHI',
  });
  console.log("FOUND_PRICES:");
  console.log(JSON.stringify(prices.data, null, 2));
}

getPrice();
