import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { encryptText, decryptText } from "../utils/crypto.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user?._id;

    // 🧩 1. Validate IDs
    if (!myId) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // 🧩 2. Fetch messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // 🧩 3. Decrypt text
    const decryptedMessages = messages.map((msg) => ({
      ...msg._doc,
      text: msg.text ? decryptText(msg.text) : "",
      image: msg.image ? decryptText(msg.image) : "",
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error("Error in getMessages controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // 🔐 Encrypt message text before saving
    const encryptedText = text ? encryptText(text) : "";

    const encryptedImageUrl = imageUrl ? encryptText(imageUrl) : "";

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
      image: encryptedImageUrl,
    });

    await newMessage.save();

    // Send decrypted version in real-time (for display)
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage._doc,
        text, // send plain text to socket client
      });
    }

    res.status(201).json({ ...newMessage._doc, text,image: imageUrl || "", });
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};