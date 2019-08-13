require('dotenv').config()
const express = require('express');
const exphbs  = require('express-handlebars');
const session = require("express-session");
var crypto = require("crypto");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const PORT = process.env.PORT || 3000;

const app = express();

var hbs = exphbs.create({
    helpers: {
        jwt: function (token){
            var atob = require('atob');
            if (token != null) {
                var base64Url = token.split('.')[1];
                var base64 = base64Url.replace('-', '+').replace('_', '/');
                return JSON.stringify(JSON.parse(atob(base64)), undefined, '\t');
            } else {
                return "Invalid or empty token was parsed"
            }
        }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use("/static", express.static("static"));

app.use(session({
  cookie: { httpOnly: true },
  secret: crypto.randomBytes(20).toString('hex'),
  saveUninitialized: false,
  resave: true
}));
 
let oidc = new ExpressOIDC({
  issuer: process.env.OKTA_OAUTH2_ISSUER,
  client_id: process.env.OKTA_OAUTH2_CLIENT_ID,
  client_secret: process.env.OKTA_OAUTH2_CLIENT_SECRET,
  appBaseUrl:process.env.APP_BASE_URL,
  scope: 'openid profile'
});

app.use(oidc.router);
  
const router = express.Router();
router.get("/",oidc.ensureAuthenticated(), (req, res, next) => {
    res.render("index",{
        user: req.userContext.userinfo,
        idtoken: req.userContext.tokens.id_token,
        accesstoken: req.userContext.tokens.access_token
       });
});
app.use(router)

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

oidc.on('ready', () => {
  app.listen(PORT,() => console.log('Application started'));
});

oidc.on("error", err => {
  console.error(err);
});