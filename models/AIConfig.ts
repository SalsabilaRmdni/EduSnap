import mongoose, { Schema, models, model } from "mongoose";

export interface IAIConfig {
  _id?: mongoose.Types.ObjectId;
  provider: "openrouter";
  model: string;
  reasoningEffort: "none" | "low" | "medium" | "high";
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const AIConfigSchema = new Schema<IAIConfig>(
  {
    provider: {
      type: String,
      required: true,
      enum: ["openrouter"],
      default: "openrouter",
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    reasoningEffort: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models.AIConfig || model<IAIConfig>("AIConfig", AIConfigSchema);
