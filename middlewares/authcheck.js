const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const authCheck = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    
  if (!token || token == null || token==undefined) {
    return res.status(401).redirect("/unauthorized");
  } else {
    const decodedToken = jwt.decode(token);
    const { _id } = decodedToken;
    const UserCheck = User.findById({ _id: _id });
    if (!UserCheck) {
      return res.status(404).render("unauthorized");
    } else {
        jwt.verify(token,process.env.JWT_SECRET)

        next()
    }
  }
  } catch (error) {
    console.log(error)
    return res.status(401).redirect("unauthorized")
  }
};

module.exports = authCheck;
