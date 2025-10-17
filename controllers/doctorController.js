import jwt from 'jsonwebtoken';

//API for doctor login
export const loginDoctor = async (req, res) => {
  try {
    const {email, password} = req.body;

    if (email === process.env.DOCTOR_EMAIL && password === process.env.DOCTOR_PASSWORD) {

      const token = jwt.sign(email+password, process.env.JWT_SECRET)
      res.json({success: true, token})
    }

    else {
      res.json({success: false, message: "Invalid credentials."})
    }
    
  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message})
  }
}