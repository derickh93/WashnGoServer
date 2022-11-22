const express = require("express");
require("express-async-errors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST);
const cors = require("cors");
const axios = require("axios");

const corsMiddleware = cors();
app.use(express.json());
app.use(corsMiddleware);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const urlEnv = "localhost:3000";

var distDir = __dirname + "/server/";
app.use(express.static(distDir));



app.post("/service-area", corsMiddleware, async (req, res) => {
  try {
    let { zipCode } = req.body;
    console.log(req.body);
    console.log(included)
    if (included) {
      res.json({
        message: "We service your area",
        success: true,
        result: true,
      });
    } else {
      res.json({
        message: "Unfortunately we are not in your area yet",
        success: true,
        result: false,
      });
    }
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "zip code not found",
      success: false,
    });
  }
});

app.post("/twilio-message", corsMiddleware, async (req, res) => {
  try {
    let { Message, SendTo } = req.body;

    const conf = await client.messages
      .create({
        body: Message,
        from: "+13479065952",
        to: SendTo,
      })
      .then((message) => console.log(message.sid));
    res.json({
      message: "text sent",
      success: true,
      result: conf,
    });
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "text not sent",
      success: false,
    });
  }
});

app.post("/create", corsMiddleware, async (req, res) => {
  try {
    let { firstName, lastName, phone, email } = req.body;
    const customer = await stripe.customers.create({
      email: email,
      phone: phone,
      name: firstName + " " + lastName,
    });
    console.log("Payment", customer);
    res.json({
      message: "Payment successful",
      stripeCust: customer,
      success: true,
    });
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "Payment failed",
      success: false,
    });
  }
});

app.post("/create-guest", corsMiddleware, async (req, res) => {
  try {
    let { email,zip} = req.body;
    const customer = await stripe.customers.create({
      email: email,
    });
    res.json({
      message: "Payment successful",
      stripeCust: customer,
      success: true,
    });
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "Payment failed",
      success: false,
    });
  }
});

app.post("/add-address", corsMiddleware, async (req, res) => {
  try {
    let {
      cid,
      address,
      city,
      state,
      address2,
      full_name,
      options,
      phone,
      zip,
    } = req.body;
    console.log(req.body);
    const customer = await stripe.customers.update(cid, {
      metadata: options,

      shipping: {
        name: full_name,
        address: {
          line1: address,
          line2: address2,
          city: city,
          state: state,
          country: "US",
          postal_code: zip,
        },
        phone,
      },
    });

    res.json({
      message: "address added",
      success: true,
      result: customer,
    });
    console.log(customer);
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "address not added",
      success: false,
    });
  }
});

app.post("/get-customer", corsMiddleware, async (req, res) => {
  try {
    let { custID } = req.body;
    console.log(custID);
    const customer = await stripe.customers.retrieve(custID);

    res.json({
      message: "customer retrieved",
      success: true,
      result: customer,
    });
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "customer not retrieved",
      success: false,
    });
  }
});

app.post("/listProducts", corsMiddleware, async (req, res) => {
  const products = await stripe.products.list({});
  console.log(products);
  return products;
});

app.post("/listPrices", corsMiddleware, async (req, res) => {
  const prices = await stripe.prices.list({});
  console.log(prices);
  return prices;
});

function encode(array, ...splat) {
  let str = "";
  for (let i = 0; i < array.length; i++) {
    str += array[i];
    if (i < splat.length) {
      str += encodeURIComponent(splat[i]);
    }
  }
  return str;
}

app.post("/getZipCode", corsMiddleware, async (req, res) => {
  let { placesID } = req.body;
  try {
    const result = await axios.get(
      encode`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placesID}&key=${process.env.GOOGLE_API_KEY}`
    );

    res.json({
      message: "Zip code retrieved",
      success: true,
      result: result.data,
    });
  } catch (error) {
    console.log("Error", error);
    res.json({
      message: "Zip code not retrieved",
      success: false,
    });
  }
});

app.post("/create-checkout-session", corsMiddleware, async (req, res) => {
  let { cid, md, line_items } = req.body;
  console.log(req.body);

  const session = await stripe.checkout.sessions.create({
    line_items: line_items,
    mode: "payment",
    success_url: `http://${urlEnv}/thankyou`,
    cancel_url: `http://${urlEnv}/confirmation`,
    customer: cid,
    allow_promotion_codes: true,
    payment_intent_data: {
      metadata: md,
      setup_future_usage: "off_session",
    },
  });
  res.json({
    message: "url received",
    success: true,
    result: session.url,
  });
  console.log(session);
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Sever is listening on port 4000");
});
