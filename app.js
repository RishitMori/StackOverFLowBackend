const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const Question = require("./models/questions");
const { error } = require("console");
dotenv.config();
mongoose.connect(process.env.MONGO_URL, (err) => {
  if (err) throw err;
});
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.get("/question/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/profile", (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
      next();
    });
  } else {
    res.status(401).json("no token");
  }
});
app.post("/question", async (req, res) => {
  const data = getUserDataFromRequest(req);
  data
    .then(async () => {
      const { question } = req.body;
      try {
        const createdQuestion = await Question.create({
          questions: question,
        });
        res.send(createdQuestion);
      } catch (err) {
        res.send("wrong input type", err);
      }
    })
    .catch(() => {
      res.send("error");
    });
});
app.put("/question", async (req, res) => {
  const questionone = req.body;
  const foundQuestion = await Question.findOne({ questionone });
  if (foundQuestion) {
    Question.updateOne({ questions: questionone });
  } else {
    res.send("question not found");
  }
});

app.delete("/question", async (req, res) => {
  const questionone = req.body;
  const foundQuestion = await Question.findOne({ questionone });
  if (foundQuestion) {
    Question.deleteOne({ questions: questionone });
    res.send("Deleted Successfully");
  } else {
    res.send("question not found");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    console.log("major error occured");
    if (err) throw err;
    res.status(500).json("error");
  }
});

const server = app.listen(4040);
