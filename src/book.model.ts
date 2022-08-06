import { Document, Schema, model, Types } from 'mongoose'

export interface BookDocument extends Document {
  _id: Types.ObjectId
  identify: number,
  mediaIdentify: number
  title: {
    english: string
    japanese?: string
    pretty?: string
  },
  images: {
    thumb: string
    cover: string
    pages: string[]
  },
  tags: Types.ObjectId[]
  uploadDate: Date
  pages: number
}

const BookSchema = new Schema<BookDocument>({
  identify: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  mediaIdentify: {
    type: Number,
    required: true
  },
  title: {
    english: { type: String, required: true },
    japanese: String,
    pretty: String
  },
  images: {
    thumb: { type: String, required: true },
    cover: { type: String, required: true },
    pages: [{ type: String, required: true }]
  },
  // @ts-ignore
  tags: {
    type: [Schema.Types.ObjectId],
    required: true,
    index: true,
    ref: 'ovo_book_tags'
  },
  uploadDate: {
    type: Date,
    required: true
  },
  pages: {
    type: Number,
    required: true
  }
})

export default model<BookDocument>('ovo_books', BookSchema)
