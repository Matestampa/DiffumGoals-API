import { get_env } from "./get_env.js";

get_env();


const MONGODB_VARS={
    url:process.env.MONGODB_URL
}

export {MONGODB_VARS};