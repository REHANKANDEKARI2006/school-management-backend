// hash.js
import bcrypt from "bcryptjs";

const password = "guardian123"; // 👈 student ka login password
const saltRounds = 10;

const hash = await bcrypt.hash(password, saltRounds);

console.log("================================");
console.log("PLAIN PASSWORD :", password);
console.log("BCRYPT HASH    :", hash);
console.log("================================");
