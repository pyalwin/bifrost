import { DiffFileData } from '../types'

export const mockDiffs: DiffFileData[] = [
  {
    filename: 'src/hero.tsx',
    language: 'tsx',
    additions: 8,
    deletions: 5,
    accepted: null,
    comments: [
      {
        id: 'c1',
        lineNumber: 6,
        author: 'You',
        text: 'Should we keep both CTAs or just the primary?',
        timestamp: '2m ago',
        resolved: false,
        replies: [
          {
            id: 'c1-r1',
            lineNumber: 6,
            author: 'Claude',
            text: 'Both CTAs serve different intents — "Get started" for new users, "Download the CLI" for developers who already know what they want.',
            timestamp: '1m ago',
            resolved: false,
            replies: [],
          },
        ],
      },
      {
        id: 'c2',
        lineNumber: 3,
        author: 'You',
        text: 'The title feels generic — can we make it more specific to what Codex does?',
        timestamp: '5m ago',
        resolved: true,
        replies: [
          {
            id: 'c2-r1',
            lineNumber: 3,
            author: 'Claude',
            text: 'Good point. Changed from "Codex" to "Codex app" to distinguish from the API.',
            timestamp: '4m ago',
            resolved: false,
            replies: [],
          },
        ],
      },
    ],
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          { type: 'context', content: 'export const hero = {', oldLineNumber: 1, newLineNumber: 1 },
          { type: 'removed', content: '  eyebrow: "New",', oldLineNumber: 2 },
          { type: 'removed', content: '  title: "Codex",', oldLineNumber: 3 },
          { type: 'removed', content: '  subtitle: "AI for developers",', oldLineNumber: 4 },
          { type: 'added', content: '  eyebrow: "Introducing",', newLineNumber: 2 },
          { type: 'added', content: '  title: "Codex app",', newLineNumber: 3 },
          { type: 'added', content: '  subtitle: "Your AI pair programmer",', newLineNumber: 4 },
          { type: 'added', content: '  primaryCta: "Get started",', newLineNumber: 5 },
          { type: 'added', content: '  secondaryCta: "Download the CLI",', newLineNumber: 6 },
          { type: 'context', content: '};', oldLineNumber: 5, newLineNumber: 7 },
        ],
      },
      {
        oldStart: 10,
        newStart: 12,
        lines: [
          { type: 'context', content: 'export const heroBullets = [', oldLineNumber: 10, newLineNumber: 12 },
          { type: 'removed', content: '  "Write code faster",', oldLineNumber: 11 },
          { type: 'removed', content: '  "Understand any repo",', oldLineNumber: 12 },
          { type: 'added', content: '  "Understands your repo in seconds",', newLineNumber: 13 },
          { type: 'added', content: '  "Executes commands safely in a sandbox",', newLineNumber: 14 },
          { type: 'added', content: '  "Turns issues into reviewed, production-ready PRs",', newLineNumber: 15 },
          { type: 'context', content: '];', oldLineNumber: 13, newLineNumber: 16 },
        ],
      },
    ],
  },
  {
    filename: 'tools/build.py',
    language: 'python',
    additions: 1,
    deletions: 1,
    accepted: null,
    comments: [
      {
        id: 'c3',
        lineNumber: 2,
        author: 'You',
        text: 'Should this log message be more descriptive for debugging?',
        timestamp: '3m ago',
        resolved: false,
        replies: [],
      },
    ],
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          { type: 'context', content: 'def build():', oldLineNumber: 1, newLineNumber: 1 },
          { type: 'removed', content: '    print("building")', oldLineNumber: 2 },
          { type: 'added', content: '    print("building launch hero...")', newLineNumber: 2 },
          { type: 'context', content: '', oldLineNumber: 3, newLineNumber: 3 },
          { type: 'context', content: 'if __name__ == "__main__":', oldLineNumber: 4, newLineNumber: 4 },
          { type: 'context', content: '    build()', oldLineNumber: 5, newLineNumber: 5 },
        ],
      },
    ],
  },
]
