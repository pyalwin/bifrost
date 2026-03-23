# The Chat Interface Is Not Enough: Why Engineers Need Collaborative UI for AI Coding

*When your AI writes code you can't see, you're not collaborating — you're delegating blindly.*

---

## The Problem Nobody Talks About

Claude is remarkably capable. Hand it a codebase, describe what you want, and it will
read files, edit code, run tests, and ship features. The terminal experience with Claude
Code is powerful. The desktop chat experience is polished. But there's a gap — a serious
one — that becomes obvious the moment you use AI for real engineering work.

**You can't see what's happening to your code.**

Claude Desktop gives you a chat window. You type a message, Claude responds with text
and maybe a code block. If it edits a file, you find out after the fact. If it makes
three changes across five files, you piece together what happened by reading its summary
or switching to your editor and scanning for differences. The model is doing real work on
your codebase, but the interface treats the interaction like a conversation about code
rather than a collaboration on code.

This distinction matters more than it sounds.

## The Engineer's Anxiety

Every experienced engineer knows the feeling: someone else is making changes to your
codebase, and you don't have visibility into what's happening. In traditional team
settings, we solved this decades ago — pull requests, code review, diff viewers, CI
pipelines. We built an entire ecosystem of tools around the principle that **code changes
should be visible, reviewable, and controllable**.

Then AI arrived, and we threw all of that out the window.

When you use Claude Desktop for coding work, you're essentially asking a very capable
junior engineer to make changes to your project while you sit in a different room,
communicating through a chat window. You can ask "what did you change?" and get a
summary. But summaries are lossy. They miss the subtle decisions — the import that was
added, the error handling path that was chosen, the variable name that doesn't quite fit
your conventions.

The terminal experience with Claude Code is better in some ways — you see tool
invocations scroll past, you can grep the output — but it's still fundamentally a log of
what happened, not a workspace where you're working together.

## What Collaboration Actually Looks Like

Real collaboration on code has specific properties:

**1. Shared visibility.** Both parties see the same thing. When one person makes a
change, the other sees it immediately — not as a description, but as the actual diff.

**2. Controllable pace.** You can pause, inspect, and redirect. Not every action needs
approval, but the option to intervene should always be there.

**3. Context preservation.** The conversation and the code changes live in the same
space. You don't context-switch between "the chat where we discussed it" and "the editor
where it happened."

**4. Review as a first-class action.** Reviewing what was done isn't an afterthought or
a separate workflow. It's woven into the same interface where the work happens.

None of these properties exist in a chat-only interface. Chat is great for discussion.
It's insufficient for engineering collaboration.

## The Gap in Claude Desktop

Claude Desktop is designed as a general-purpose conversational interface. That's exactly
what it should be — it serves researchers, writers, analysts, and casual users
beautifully. But the design choices that make it great for general use are the same ones
that make it insufficient for engineering:

**No live diff view.** When Claude edits your files, you don't see a side-by-side diff
updating in real time. You see a message saying "I've updated `server.ts`." The actual
change — the lines added, removed, modified — is hidden behind a trip to your editor or
terminal.

**No tool approval granularity.** In a coding session, Claude might read 20 files, edit
5, and run 3 shell commands. Some of those actions are completely safe (reading a config
file). Others deserve scrutiny (running a database migration). A chat interface gives you
binary control: allow everything or block everything. What you actually need is a
spectrum — auto-approve the safe stuff, surface the risky stuff.

**No session continuity across the codebase.** Claude Desktop sessions are
conversational threads. They don't map to your project structure, your branches, your
working directories. When you come back tomorrow, you're starting a new conversation, not
resuming a coding session.

**No code review workflow.** After Claude makes changes, reviewing them means leaving the
interface entirely. Open your editor, run `git diff`, read the output, come back to the
chat, type your feedback. This loop is slow and fragmented. It actively discourages the
kind of careful review that produces good code.

**No branch or git awareness.** Claude Desktop doesn't know what branch you're on, what
your base branch is, or what your uncommitted changes look like. It operates in a
vacuum. But engineering work is deeply contextual — the same change means different things
on `main` versus a feature branch.

These aren't minor missing features. They represent a fundamental mismatch between the
interface paradigm (chat) and the task domain (collaborative software engineering).

## What a Collaborative UI Needs

Building Bifrost forced us to answer a specific question: *what does an interface look
like when the human and the AI are genuinely working on code together?*

The answer isn't "a better chat." It's a workspace with multiple synchronized views:

### The Conversation Panel

Chat stays — it's still the primary way you communicate intent. But it's enhanced. You
see Claude's thinking process in collapsible blocks. Tool executions appear inline with
status indicators: a spinner while running, a checkmark on success, an X on failure. You
see *what Claude is doing* as it works, not just what it says afterward.

### The Live Diff Panel

This is the centerpiece of the collaborative experience. As Claude edits files, git
diffs update in real time — syntax-highlighted, with line numbers, additions in green,
deletions in red. You watch the code change as it happens. If Claude adds an import you
don't want, you see it immediately and can redirect before it builds on that decision.

Each file in the diff has accept and reject controls. Accept stages the change. Reject
reverts it. This is the same mental model as code review, but happening live, in the
same window where the conversation is happening.

### Inline Code Review

You can click on any line in the diff and leave a comment. These comments form threads
— reply, discuss, resolve. When you're done reviewing, you submit the review, and your
comments go back to Claude as structured feedback: "Please address these code review
comments." Claude reads them, understands the context (because it has the full diff and
the line-specific comments), and iterates.

This is pair programming with the review cycle built in. Not "code, then review later"
but "code together, review as you go."

### Branch and Git Awareness

The title bar shows your current branch. A dropdown lets you switch branches or create
new ones. You set a base branch, and the diff panel shows changes relative to that base
— exactly like a pull request. A commit dialog lets you stage files, write (or
AI-generate) commit messages, and commit without leaving the interface.

The interface knows where you are in your git workflow. It doesn't treat every
interaction as a stateless conversation. It understands that you're on
`feat/auth-refactor`, you branched from `main`, and you have 3 uncommitted files.

### Tool Approval That Makes Sense

Two modes: auto-approve and manual. In auto-approve mode, safe operations (reading
files, listing directories) happen silently. Dangerous operations still surface for
approval. In manual mode, every tool call shows a banner: "Claude wants to run
`npm test`" with approve and deny buttons.

This is the granularity that matters. You're not choosing between "trust completely" and
"approve everything." You're choosing the level of oversight appropriate to the task and
the moment.

## Why This Matters Beyond Convenience

The argument for collaborative UI isn't just "it's nicer to use." It's about the quality
of the output.

When you can see every change as it happens, you catch problems earlier. A misnamed
variable. An unnecessary dependency. A logic branch that doesn't match your mental model.
In a chat interface, these issues compound — Claude builds on its own earlier decisions,
and by the time you review, undoing the wrong turn means undoing everything that came
after it.

When you can review inline and submit structured feedback, the iteration cycle tightens.
Claude doesn't have to guess which part of a 200-line change you're referring to when you
say "that doesn't look right." You're pointing at line 47 and saying exactly what's
wrong.

When you have session continuity and branch awareness, you maintain context across days
and tasks. You're not re-explaining your project structure every morning. You resume where
you left off, on the same branch, with the same conversation history.

**Better interfaces produce better collaboration. Better collaboration produces better
code.**

## The Deeper Principle

There's a pattern in how we adopt new tools: first we use the new thing through the
interface of the old thing. Early cars looked like horse carriages. Early websites looked
like printed pages. Early AI coding tools look like chat windows.

Chat was the natural first interface for AI because the underlying technology is a
language model. You talk to it, it talks back. But the task — software engineering — has
its own shape, its own workflows, its own information needs. The interface should match
the task, not the technology.

A coding-focused collaborative UI isn't about making AI more comfortable. It's about
making the *human* more effective. It's about preserving the engineering practices we
know produce good outcomes — visibility, review, incremental approval, context awareness
— while embracing the speed and capability of AI.

The chat window was a starting point. It's time we built the interface that the work
actually demands.

---

*Bifrost is an open-source desktop UI for Claude Code that implements these ideas. It's
available at [github.com/pyalwin/bifrost](https://github.com/pyalwin/bifrost).*
