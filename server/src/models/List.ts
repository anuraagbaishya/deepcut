import mongoose, { Document, Schema } from 'mongoose';

export interface ListItem {
  rank: number;
  value: string;
  hint?: string;
}

export interface IList extends Document {
  slug: string;
  title: string;
  category: string;
  description: string;
  items: ListItem[];
}

const ListItemSchema = new Schema<ListItem>(
  {
    rank: { type: Number, required: true },
    value: { type: String, required: true },
    hint: { type: String },
  },
  { _id: false }
);

const ListSchema = new Schema<IList>({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  items: { type: [ListItemSchema], required: true },
});

export default mongoose.model<IList>('List', ListSchema);
