import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

export type SignalOutcome = "HIT" | "MISS" | "PENDING";

@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: {
    collection: "signal_rounds",
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
})
export class SignalRound extends TimeStamps {
  /** Predicted multiplier (e.g. 1.5, 2.0, 3.7) */
  @prop({ required: true, type: Number })
  predictedMultiplier!: number;

  /** Actual multiplier result (null if round not yet resolved) */
  @prop({ required: false, type: Number, default: null })
  actualMultiplier?: number | null;

  /** Confidence score 0–100 from the prediction engine */
  @prop({ required: true, type: Number })
  confidence!: number;

  /** Outcome of the prediction */
  @prop({ required: true, type: String, enum: ["HIT", "MISS", "PENDING"], default: "PENDING" })
  outcome!: SignalOutcome;

  /** Pattern label used by the prediction engine */
  @prop({ required: false, type: String })
  patternLabel?: string;

  /** Round sequence number */
  @prop({ required: true, type: Number })
  roundNumber!: number;
}

export const SignalRoundModel = getModelForClass(SignalRound);
