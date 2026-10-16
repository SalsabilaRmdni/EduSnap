import bcrypt from "bcryptjs";

async function test() {
  try {
    const res = await bcrypt.compare("secret", undefined as any);
    console.log("Result:", res);
  } catch (e: any) {
    console.log("Bcrypt threw error:", e.message);
  }
}

test();
