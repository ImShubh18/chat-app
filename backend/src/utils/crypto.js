import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // 16 bytes for AES
const SECRET_KEY = Buffer.from(process.env.MSG_SECRET_KEY, "hex");

export const encryptText = (plainText) => {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // Store as IV:CipherText
};

export const decryptText = (encryptedText) => {
  if (!encryptedText) return "";

  try {
    const [ivHex, encrypted] = encryptedText.split(":");

    // If format doesn’t contain IV, assume plain text (old message)
    if (!ivHex || !encrypted) return encryptedText;

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    // Return raw text if decryption fails (old or malformed data)
    return encryptedText;
  }
};