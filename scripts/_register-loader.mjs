import { register } from "node:module";

register("./_server-only-loader.mjs", import.meta.url);
