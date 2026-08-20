const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const register = async (req, res) => {
  try {
    let { name, email, password, department, year_of_study, phone_number, bio } = req.body;

    // 1. Basic sanitization & field existence checks
    if (!name || !email || !password || !department || year_of_study === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required registration fields.'
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();
    department = department.trim();
    phone_number = phone_number ? phone_number.trim() : null;
    bio = bio ? bio.trim() : null;

    // 2. Format Validations
    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    // Password strength check (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    const parsedYear = parseInt(year_of_study, 10);
    if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year of study. Must be a number between 1 and 6.'
      });
    }

    // 3. College email domain verification
    const emailDomain = process.env.COLLEGE_EMAIL_DOMAIN;
    if (emailDomain && emailDomain.trim() !== '') {
      const normalizedDomain = emailDomain.trim().toLowerCase();
      if (!email.endsWith(`@${normalizedDomain}`) && !email.endsWith(`.${normalizedDomain}`)) {
        return res.status(400).json({
          success: false,
          message: `Registration is restricted to college students with emails ending in ${emailDomain}.`
        });
      }
    }

    // 4. Duplicate email check (parameterized query)
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 5. Password hashing (bcryptjs)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 6. DB User insertion (force STUDENT role and PENDING_VERIFICATION status)
    const [result] = await db.query(
      `INSERT INTO users 
      (name, email, password_hash, department, year_of_study, phone_number, bio, role, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'STUDENT', 'PENDING_VERIFICATION')`,
      [name, email, password_hash, department, parsedYear, phone_number, bio]
    );

    // 7. Success response
    return res.status(201).json({
      success: true,
      message: 'Registration successful. Account pending email verification.',
      data: {
        user: {
          id: result.insertId,
          name,
          email,
          role: 'STUDENT',
          status: 'PENDING_VERIFICATION'
        }
      }
    });

  } catch (error) {
    console.error('Registration error occurred:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user registration.'
    });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    email = email.trim().toLowerCase();

    // 1. Query user by email (parameterized query)
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      // Return generic authentication error
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Return generic authentication error
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 3. Check status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact the administrator.'
      });
    }

    // 4. Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET is missing. Cannot sign token.');
      return res.status(500).json({
        success: false,
        message: 'Internal server security configuration issue.'
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRE_TIME || '7d' }
    );

    // 5. Success response with token and safe user details
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          department: user.department,
          year_of_study: user.year_of_study
        }
      }
    });

  } catch (error) {
    console.error('Login error occurred:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user login.'
    });
  }
};

const me = async (req, res) => {
  // User is already attached by the protect middleware
  return res.status(200).json({
    success: true,
    message: 'User details retrieved successfully.',
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        department: req.user.department,
        year_of_study: req.user.year_of_study
      }
    }
  });
};

module.exports = {
  register,
  login,
  me
};
