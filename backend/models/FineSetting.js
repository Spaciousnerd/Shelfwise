import mongoose from "mongoose";
const FineSettingSchema = mongoose.Schema(
  {
    amount: {
      type: Number,
      default: 10,
    },
    interval: {
      type: String,
      default: "day",
    },
  },
  { timestamps: true },
);
export default mongoose.model("FineSetting", FineSettingSchema);
