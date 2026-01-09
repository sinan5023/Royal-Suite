const express = require("express");
//routes
const StaticRoute = require("./Routes/staticRoutes");
const customerRoutes = require("./Routes/customerRoutes");
const inventoryRoutes = require("./Routes/inventoryRoutes");
const bookingRoutes = require("./Routes/bookingRoutes");
const invoiceRoutes = require("./Routes/invoiceRoutes");
const analyticsRoutes = require("./Routes/analyticsRoutes")
const expenseRoutes = require("./Routes/expenseRoutes")
//APIS
const authApi = require("./Routes/api/authApi");
const customerApi = require("./Routes/api/customerApi");
const inventoryApi = require("./Routes/api/inventoryApi");
const bookingApi = require("./Routes/api/bookingApi");
const invoiceApi = require("./Routes/api/invoiceApi");
const dashboardApi = require("./Routes/api/dashboardApi");
const calendarApi = require("./Routes/api/calendarApi")
const analyticsApi = require("./Routes/api/analyticsApi")
const expenseApi = require("./Routes/api/expenseApi")
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
app.use("/inventory", inventoryRoutes);
app.use("/bookings", bookingRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/analytics", analyticsRoutes)
app.use("/expenses",expenseRoutes)
// apis.    {
//inventory API
app.use("/api/inventory", inventoryApi);
//auth API
app.use("/api/auth", authApi);
//customer API
app.use("/api/customers", customerApi);
//booking API
app.use("/api/bookings", bookingApi);
//invoice API
app.use("/api/invoices", invoiceApi);
//dashboard API
app.use("/api/dashboard", dashboardApi);
//calendar API
app.use("/api/calendar",calendarApi)
//analytics dashboard API
app.use("/api/analytics",analyticsApi)
// expense API
app.use("/api/expenses",expenseApi)

//   }

app.use((req, res, next) => {
  res.render("pagenotfound");
});

startServer();
function startServer() {
  try {
    ConnectDB()
      .then(
        console.log("DB Connection Established"),
        app.listen(process.env.PORT, () => {
          console.log("The Server Is Up And Running");
        })
      )
      .catch(error);
  } catch (err) {
    console.error(
      "Cannot Establish Connection with DB , Unable To Start The Server"
    );
  }
}
