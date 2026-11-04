import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

/*db.connect()
  .then(() => {
    console.log("DB connected successfully");
  })
  .catch((err) => {
    console.log("DB is not connected becuase ther is som error" + err);
  });*/

export default db;
