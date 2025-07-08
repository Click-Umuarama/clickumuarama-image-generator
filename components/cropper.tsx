"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "@/components/ui/cropper"

type Area = { x: number; y: number; width: number; height: number }

type CropperComponentProps = {
  imageUrl: string
  aspectRatio: number
  onCropChange?: (crop: Area | null) => void
}

export function CropperComponent({ imageUrl, aspectRatio, onCropChange }: CropperComponentProps) {
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [zoom, setZoom] = useState(1)
  const cropperContainerRef = useRef<HTMLDivElement>(null)

  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels)
    onCropChange?.(pixels)
  }, [onCropChange])

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  useEffect(() => {
    const handleGlobalWheel = (event: WheelEvent) => {
      const target = event.target as Element
      const cropperContainer = cropperContainerRef.current

      if (cropperContainer && cropperContainer.contains(target) && event.ctrlKey) {
        event.preventDefault()
        event.stopImmediatePropagation()

        const delta = event.deltaY > 0 ? -1 : 1
        const zoomMultiplier = 2
        const newZoom = Math.max(1, Math.min(3, zoom + (delta * zoomMultiplier * 0.1)))

        setZoom(newZoom)
      }
    }

    document.addEventListener('wheel', handleGlobalWheel, {
      passive: false,
      capture: true
    })

    return () => {
      document.removeEventListener('wheel', handleGlobalWheel, { capture: true })
    }
  }, [zoom])

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center text-gray-500">
            <p>Adicione uma URL de imagem para começar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div
        ref={cropperContainerRef}
        className="w-full h-full"
      >
        <Cropper
          className="w-full h-full"
          image={imageUrl}
          aspectRatio={aspectRatio}
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          zoom={zoom}
          minZoom={1}
          maxZoom={3}
          zoomSensitivity={0.00025}
        >
          <CropperDescription />
          <CropperImage />
          <CropperCropArea className="border border-gray-300" />
        </Cropper>
      </div>
    </div>
  )
}