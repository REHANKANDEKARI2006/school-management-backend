import bcrypt from "bcryptjs";

const password = "admin123"; // jo password login me use karoge

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("HASH:", hash);
})();
