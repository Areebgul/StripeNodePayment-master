const express = require("express");
const bodyparser = require("body-parser");
const path = require("path");
const app = express();
const fs = require("fs");

var Publishable_Key =
  "pk_test_51JfEgPGpg6H0uU7ktimHcXlCXEyhicv2RBfXalDV6MOLISZLWqewvpcrMhfLSf93yBKmAwlH3jJR2o7KzCXK5pZR000DbPvKSP";
var Secret_Key =
  "sk_test_51JfEgPGpg6H0uU7k67c4bkVhUCyvI5TdQYXhMbLY2UyejsaFutOOzZoRh7bVZK4DrbkE9e5h0ok6XgU0WSI9ShJN00eSaSR5oQ";

const stripe = require("stripe")(Secret_Key);

const port = process.env.PORT || 3000;

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// View Engine Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("Home", {
    key: Publishable_Key,
  });
});
app.post("/Stripe_transfer_to_account", async (req, res) => {
  const transfer = await stripe.transfers.create({
    amount: 400,
    currency: "cad",
    destination: "acct_1Jtn6S2fcJH2L2fw",
  });
  if (transfer) {
    res.json(transfer);
  }
});

app.post("/user_creation", async (req, res) => {
  console.log("req.body: ", req.body);
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  console.log("account: ", account);
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "http://localhost:3000/refresh_url/" + account.id,
    return_url: "http://localhost:3000/return_url/" + account.id,
    type: "account_onboarding",
  });
  console.log("accountLink: ", accountLink);
  res.json(accountLink);
});

app.get("/return_url/:id", async (req, res) => {
  console.log("req.params.id", req.params.id);
  const account = await stripe.accounts.retrieve(req.params.id);
  if (
    account.capabilities.transfers == "active" &&
    account.capabilities.card_payments == "active"
  ) {
    res.writeHead(301, {
      Location: "https://www.google.com/",
    });
  } else {
    const deleted = await stripe.accounts.del(req.params.id);
    if (deleted) {
      console.log("deleted: ", deleted);
      res.writeHead(301, {
        Location: "https://www.youtube.com",
      });
    }
  }
  console.log("return_url: ", account.capabilities);
  res.end();
});

app.get("/refresh_url/:id", async (req, res) => {
  console.log("refresh_url.params.id", req.params.id);
  const accountLink = await stripe.accountLinks.create({
    account: req.params.id,
    refresh_url: "http://localhost:3000/refresh_url/" + req.params.id,
    return_url: "http://localhost:3000/return_url/" + req.params.id,
    type: "account_onboarding",
  });
  res.writeHead(301, {
    Location: accountLink.url,
  });
  console.log("new.accountLink.url", accountLink.url);
  res.end();
});

app.post("/payment", async (req, res) => {
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
      name: "Ali Raza",
      address: {
        line1: "Mazdoor Pulli",
        postal_code: "57000",
        city: "Sahiwal",
        state: "Punjab",
        country: "Pakistan",
      },
    })
    .then((customer) => {
      console.log(customer);
      return stripe.charges.create({
        amount: 700 * 100, // Charing Rs 25
        description: "Testing Payment",
        currency: "CAD",
        customer: customer.id,
      });
    })
    .then((charge) => {
      res.send("Success"); // If no error occurs
    })
    .catch((err) => {
      res.send(err); // If some error occurs
    });
});

app.listen(port, function (error) {
  if (error) throw error;
  console.log("Server created Successfully");
});
