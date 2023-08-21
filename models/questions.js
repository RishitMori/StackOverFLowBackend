const mongoose = require("mongoose");

const questionsSchema = new mongoose.Schema(
  {
    questions: String,
  },
  { timestamps: true }
);

const questionModel = mongoose.model("question", questionsSchema);

module.exports = questionModel;
