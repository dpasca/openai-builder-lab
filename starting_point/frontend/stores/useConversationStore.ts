import { create } from 'zustand'
import { Item } from '@/lib/assistant'
import { INITIAL_MESSAGE } from '@/lib/constants'

interface ConversationState {
  chatMessages: Item[]
  setChatMessages: (items: Item[]) => void
  addChatMessage: (item: Item) => void
}

const useConversationStore = create<ConversationState>((set) => ({
  chatMessages: [
    {
      type: 'message',
      role: 'assistant',
      content: INITIAL_MESSAGE
    }
  ],
  setChatMessages: items => set({ chatMessages: items }),
  addChatMessage: item =>
    set(state => ({ chatMessages: [...state.chatMessages, item] }))
}))

export default useConversationStore
