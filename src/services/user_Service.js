import bcrypt from "bcryptjs";
import { UserModel } from "../models/user_Model.js";

export const UserService = {
  async createStudentUser(payload) {
    if (!payload.email) {
      throw Object.assign(new Error("Email is required for user"), {
        status: 400,
      });
    }

    const passwordHash = await bcrypt.hash("Student@123", 10); 
    // default password (later reset flow)

    const user = {
      user_name: payload.email.split("@")[0],
      institute_id: payload.institute_id || 1,
      email: payload.email,
      password_hash: passwordHash,
      role_id: 5, // 🎓 STUDENT ROLE
    };

    return await UserModel.createUser(user);
  },
};
