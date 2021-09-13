const mongoose = require("mongoose");
const ObjectID = require("mongodb").ObjectID;
let db;

//Connect to MongoDB
exports.cnctDB = (collectionname) => {
  let dbLink = `mongodb://localhost/${collectionname}`;
  mongoose.connect(dbLink, { useNewUrlParser: true, useUnifiedTopology: true });

  db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
    console.info("Connected to MongoDB using " + collectionname);
  });
};

//takes input with type Model. Saves that model in Database. Cant be used before cnctDB or cnctDBAuth.
exports.saveToDB = (input) => {
  input.save(() => {});
};
