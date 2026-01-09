import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT: number = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, () => {
  console.log(`Node.js backend server running on http://localhost:${PORT}`);
});
