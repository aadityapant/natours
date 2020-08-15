/*eslint-disable*/
import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    //Obtiain the checkout session from the API
    const stripe = Stripe(
      'pk_test_51HFfUUDk23fFSNpdJ4pPSBhtg0VyDNvNmF83qIKtNX9BpRE2BgH1Fy3flIwfzpN6174XEUQIcRE1tUAv2n2BzFbB00cijKj2lh'
    );
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );

    //Create the form and process the card using credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err.name, err.message);
    showAlert('error', err);
  }
};
