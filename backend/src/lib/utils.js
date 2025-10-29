import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true, // always true in deployment (Render uses HTTPS)
    sameSite: "none", // allows cross-site cookies (Vercel <-> Render)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};
