import type { ImageAttachment } from '../../types'

interface Props {
  content: string
  images?: ImageAttachment[]
}

export function UserMessage({ content, images }: Props) {
  return (
    <div className="flex justify-end mb-5 animate-fade-in-up">
      <div className="bg-user-bubble text-white px-4 py-3 rounded-[16px_16px_4px_16px] max-w-[80%] text-sm leading-relaxed">
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mediaType};base64,${img.base64}`}
                alt={img.name}
                className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        {content}
      </div>
    </div>
  )
}
