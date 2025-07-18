export type TipTapMentionJsonContent = {
  type: 'doc'
  content: {
    type: 'paragraph'
    content?: (
      | {
          type: 'text'
          text: string
        }
      | {
          type: 'mention'
          attrs: {
            id: string
            label: string
          }
        }
      | {
          type: 'hardBreak'
        }
    )[]
  }[]
}
