import { Document, Schema, model, Types } from 'mongoose'
import { TagNamespace } from './interface'

export interface TagDocument extends Document {
  _id: Types.ObjectId
  identify: number
  namespace: TagNamespace
  value: string
  count: number
}

const TagSchema = new Schema<TagDocument>({
  identify: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  namespace: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  value: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true
  }
})

export default model<TagDocument>('ovo_book_tags', TagSchema)
