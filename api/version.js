import { readFileSync } from "fs";

export default function handler(req, res) {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
    );

    return res.status(200).json({ version: packageJson.version });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load version" });
  }
}