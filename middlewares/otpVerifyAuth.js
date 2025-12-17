const jwt = require("jsonwebtoken")
const otpVerifyMiddleware = async(req,res,next)=>{
   try {
     const {Otptoken} = req.cookies
    if(!Otptoken){
        res.status(401).redirect("/unauthorized")
    }else{
        jwt.verify(Otptoken,process.env.OTP_TOKEN_SECRET)
        next()
    }
   } catch (error) {
    console.log(error)
    return res.status(401).redirect("unauthorized")
   }

}

module.exports = otpVerifyMiddleware