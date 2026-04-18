import bcrypt from "bcryptjs";

const password = "nikita123";

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("HASH_RESULT:" + hash);
})();
