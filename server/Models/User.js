const mongoose = require("mongoose");

//Creates the UserSchema and exports it
const UserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  loc: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
