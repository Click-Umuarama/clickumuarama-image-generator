import Image from 'next/image'

interface OriginalImageProps {
	imageUrl: string
}

export function OriginalImage({ imageUrl }: OriginalImageProps) {
	return (
		<Image
			src={imageUrl}
			alt="Original Image"
			className="w-full h-full object-cover"
		/>
	)
}
