import jwt from 'jsonwebtoken';

// API for doctor login (DB-backed)
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const doctor = await doctorModel.findOne({ email: email.toLowerCase().trim() });
    if (!doctor) {
      return res.json({ success: false, message: 'Account not found' });
    }

    const ok = await bcrypt.compare(password, doctor.password);
    if (!ok) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: doctor._id, role: 'doctor' }, process.env.JWT_SECRET);
    return res.json({ success: true, token });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}
