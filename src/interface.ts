import type { TagType } from '@l2studio/nhentai-api'

export type TagNamespace = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const TagNamespaceMappings: Record<TagType, TagNamespace> = {
  tag: 0,
  category: 1,
  artist: 2,
  parody: 3,
  character: 4,
  group: 5,
  language: 6
}

export const TagNamespaceMappingsReverse: Record<TagNamespace, TagType> = {
  0: 'tag',
  1: 'category',
  2: 'artist',
  3: 'parody',
  4: 'character',
  5: 'group',
  6: 'language'
}
