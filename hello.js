try {
    const { Otptoken } = req.cookies;
    console.log(req.cookies)
    console.log(Otptoken)
  const decodedToken = await jwt.decode(Otptoken);
  const { email } = decodedToken;
  if (!Otptoken) {
    res.status(401).redirect("/unauthorized");
  }
  const response = await resendOtpService(Otptoken, email);
  if (response.ok) {
    res
      .status(200)
      .cookie("Otptoken", response.token)
      .json({ ok: response.ok, message: response.messsage });
  } else {
    res.status(400).json({ ok: response.ok, message: response.messsage });
  }
  } catch (error) {
    res.status(500).json({ok:false,message:"error sending an otp"})
    console.log(error)

  }







   const code = await OtpStore.findOne({ email: email, consumed: false }).sort({
      createdAt: -1,
    });
    console.log(code);
    if (!code || code.consumed === true) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      console.log(otp);
      await sendOtp(email, otp);
      const payload = {
        email: email,
        purpose: "verify-otp",
      };
      const token = await jwt.sign(payload, process.env.OTP_TOKEN_SECRET, {
        expiresIn: "3m",
      });
      OtpStore.create({
        email,
        otp,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      });
      return {
        ok: true,
        messsage: "Otp sent succesfully",
        token: token,
      };
    } else {
      await sendOtp(email, code.otp);
      return {
        ok: true,
        messsage: "Otp sent succesfully",
        Otptoken: Otptoken,
      };
    }
  };








