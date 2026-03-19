import { atp, wta, surfaces } from "../src/lib/tennis/data";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(200).json({
    surfaces,
    atp,
    wta,
  });
}
