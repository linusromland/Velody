//Local dependencies import
const User = require("./Models/User");

//Finds all Users in MongoDB
exports.findInDB = async () => {
  return await User.find({});
};

//Finds a specific user with specified id
exports.findUserWithID = async (toFind) => {
  return await User.findOne({ id: toFind });
};

//Updates location for a specific user
exports.updateLoc = async (id, loc) => {
  await User.updateOne({ id: id }, { $set: { loc: loc } });
};
