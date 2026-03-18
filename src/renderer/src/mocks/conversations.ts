import { Conversation } from '../types'
import { mockDiffs } from './diffs'

export const mockConversation: Conversation = {
  id: '1',
  branch: 'feature/codex-cta',
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'Create a compelling launch hero for the new Codex app on openai.com/codex',
    },
    {
      id: 'm2',
      role: 'assistant',
      content: "I'll update the hero copy to clearly communicate what Codex app does, add outcome-focused bullets, and ensure the CTAs align with launch goals.",
      thinkingTime: 7,
      tools: [
        { action: 'Explored', target: '2 files', status: 'success' },
        { action: 'Edited', target: 'hero.tsx', status: 'success' },
        { action: 'Read', target: 'build.py', status: 'success' },
        { action: 'Edited', target: 'build.py', status: 'success' },
      ],
    },
    {
      id: 'm3',
      role: 'assistant',
      content: 'Updated the launch hero to emphasize real developer outcomes (repo understanding, safe execution, PR delivery), and aligned the CTAs with launch intent.',
    },
    {
      id: 'm4',
      role: 'user',
      content: 'Can you also update the config to enable the new feature flag?',
    },
    {
      id: 'm5',
      role: 'assistant',
      content: "I'll update the feature flag configuration.",
      thinkingTime: 3,
      tools: [
        { action: 'Edited', target: 'config.yml', status: 'error' },
      ],
    },
  ],
  diffs: mockDiffs,
}
