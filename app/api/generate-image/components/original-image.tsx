interface OriginalImageProps {
  imageUrl: string
}

export function OriginalImage({ imageUrl }: OriginalImageProps) {
  return (
    <img
      src={imageUrl}
      alt="Original Image"
      className="w-full h-full object-cover"
    />
  )
} 