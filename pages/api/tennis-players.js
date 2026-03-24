import surfaces from "../../data/tennis/surfaces";
import atp from "../../data/tennis/atp";
import wta from "../../data/tennis/wta";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(200).json({
    surfaces,
    atp,
    wta,
  });
}
