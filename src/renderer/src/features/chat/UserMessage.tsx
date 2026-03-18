interface Props { content: string }

export function UserMessage({ content }: Props) {
  return (
    <div className="flex justify-end mb-5">
      <div className="bg-user-bubble text-white px-4 py-3 rounded-[16px_16px_4px_16px] max-w-[80%] text-sm leading-relaxed">
        {content}
      </div>
    </div>
  )
}
