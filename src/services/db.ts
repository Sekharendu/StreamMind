import "dotenv/config";
import {Pool} from "pg";

// const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({connectionString});
export {pool};
export async function checkDBConnection(){
    const res = await pool.query("SELECT NOW()");
    return res.rows[0].now;
}