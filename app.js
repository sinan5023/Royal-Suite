const express = require("express");
//routes
const StaticRoute = require("./Routes/staticRoutes");
const authApi = require("./Routes/api/authApi");
const customerRoutes = require("./Routes/customerRoutes");
const customerApi = require("./Routes/api/customerApi")
//routes-end
const dotenv = require("dotenv");
const path = require("node:path");
const ConnectDB = require("./config/databse");
const cookieparser = require("cookie-parser");

dotenv.config();
const app = express();
//global middlewares
app.use(express.json());
app.use(cookieparser());
app.use(express.urlencoded({ extended: true }));
// ejs engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
//routes
app.use("/", StaticRoute);
app.use("/customers", customerRoutes);
// apis.    {
//auth api
app.use("/api/auth", authApi);
//customer api
app.use("/api/customer",customerApi)

//   }

app.use((req, res, next) => {
  res.render("pagenotfound");
});

startServer();
function startServer() {
  try {
    ConnectDB().then(
      console.log("DB Connection Established"),
      app.listen(process.env.PORT, () => {
        console.log("The Server Is Up And Running");
      })
    );
  } catch (err) {
    console.error(
      "Cannot Establish Connection with DB , Unable To Start The Server"
    );
  }
}
