import Cryptr from "cryptr";

export const cryptr = new Cryptr(process.env.ENCRYPTION_KEY!);

export const encrypt = (text: string) => cryptr.encrypt(text);
export const decrypt = (text: string) => cryptr.decrypt(text);
