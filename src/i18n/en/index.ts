import core from "./core.ts";
import shell from "./shell.ts";
import trip from "./trip.ts";
import tools from "./tools.ts";
import data from "./data.ts";

/** 영어 사전. 묶음마다 파일을 나눠 두고 여기서 합친다 */
const EN: Record<string, string> = { ...data, ...core, ...shell, ...trip, ...tools };

export default EN;
