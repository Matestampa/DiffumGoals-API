import dotenv from "dotenv";
import { fileURLToPath } from 'url';

import {join,dirname} from "path"

const APP_ENV=process.env.APP_ENV?process.env.APP_ENV:"dev";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
let __dirname=dirname(__filename);
let env_absPath=join(__dirname,`../../.env.${APP_ENV}`);

dotenv.config({path:env_absPath});


function get_env(){
}

export {get_env};