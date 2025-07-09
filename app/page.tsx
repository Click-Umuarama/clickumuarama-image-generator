"use client"

import type React from "react"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CropperComponent } from "@/components/cropper"
import { CombinedImageGenerator } from "@/components/combined-image-generator"
import { Textarea } from "@/components/ui/textarea"
import { useDebounceWithState } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

type AspectRatio = "feed" | "story"

interface CropSettings {
  imageUrl: string
  kicker: string
  kickerBgColor: string
  kickerTextColor: string
  title: string
  aspectRatio: AspectRatio
  crop: {
    x: number
    y: number
    width: number
    height: number
  }
  croppedImageUrl: string | null
  finalImageUrl: string | null
  proxiedImageUrl: string | null
}

export default function ImageCropper() {
  const searchParams = useSearchParams()
  const imgParam = searchParams.get("img")
  const kickerParam = searchParams.get("kicker")
  const titleParam = searchParams.get("title")
  const kickerBgColorParam = searchParams.get("kickerBg")
  const kickerTextColorParam = searchParams.get("kickerColor")

  const [settings, setSettings] = useState<CropSettings>({
    imageUrl: imgParam ?? "",
    kicker: kickerParam ?? "",
    kickerBgColor: kickerBgColorParam ?? "#D4D4D4",
    kickerTextColor: kickerTextColorParam ?? "#000000",
    title: titleParam ?? "",
    aspectRatio: "feed",
    crop: {
      x: 0,
      y: 0,
      width: 400,
      height: 500,
    },
    croppedImageUrl: null,
    finalImageUrl: null,
    proxiedImageUrl: null,
  })

  const [isProcessing, setIsProcessing] = useState(false)

  const prevCropRef = useRef(settings.crop)
  const prevAspectRatioRef = useRef(settings.aspectRatio)
  const prevProxiedImageUrlRef = useRef<string | null>(null)

  const [debouncedCrop, isCropDebouncing] = useDebounceWithState(settings.crop, 750)
  const [debouncedAspectRatio, isAspectRatioDebouncing] = useDebounceWithState(settings.aspectRatio, 750)
  const [debouncedKicker, isKickerDebouncing] = useDebounceWithState(settings.kicker, 750)
  const [debouncedTitle, isTitleDebouncing] = useDebounceWithState(settings.title, 750)
  const [debouncedKickerBgColor, isKickerBgColorDebouncing] = useDebounceWithState(settings.kickerBgColor, 750)
  const [debouncedKickerTextColor, isKickerTextColorDebouncing] = useDebounceWithState(settings.kickerTextColor, 750)

  const fetchImageThroughProxy = useCallback(async (imageUrl: string) => {
    try {
      setIsProcessing(true)
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      setSettings((prev) => ({ ...prev, proxiedImageUrl: blobUrl }))
    } catch (error) {
      console.error("Error fetching image through proxy:", error)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const generateCroppedImage = useCallback(async () => {
    if (!debouncedCrop || !settings.proxiedImageUrl) return

    const prevCrop = prevCropRef.current
    const hasCropChanged =
      prevCrop.x !== debouncedCrop.x ||
      prevCrop.y !== debouncedCrop.y ||
      prevCrop.width !== debouncedCrop.width ||
      prevCrop.height !== debouncedCrop.height

    const hasAspectRatioChanged = prevAspectRatioRef.current !== debouncedAspectRatio

    const hasImageChanged = prevProxiedImageUrlRef.current !== settings.proxiedImageUrl

    if (!hasCropChanged && !hasAspectRatioChanged && !hasImageChanged) {
      return
    }

    try {
      setIsProcessing(true)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const outputWidth = 1080
        const outputHeight = debouncedAspectRatio === "feed" ? 1350 : 1920

        canvas.width = outputWidth
        canvas.height = outputHeight

        ctx.drawImage(
          img,
          debouncedCrop.x,
          debouncedCrop.y,
          debouncedCrop.width,
          debouncedCrop.height,
          0,
          0,
          outputWidth,
          outputHeight
        )

        canvas.toBlob((blob) => {
          if (blob) {
            if (settings.croppedImageUrl && settings.croppedImageUrl.startsWith("blob:")) {
              URL.revokeObjectURL(settings.croppedImageUrl)
            }

            const croppedImageUrl = URL.createObjectURL(blob)
            setSettings((prev) => ({ ...prev, croppedImageUrl }))

            prevCropRef.current = debouncedCrop
            prevAspectRatioRef.current = debouncedAspectRatio
            prevProxiedImageUrlRef.current = settings.proxiedImageUrl
          }
        }, 'image/png')
      }

      img.onerror = () => {
        throw new Error('Failed to load image')
      }

      img.src = settings.proxiedImageUrl
    } catch (error) {
      console.error("Error generating cropped image:", error)
    } finally {
      setIsProcessing(false)
    }
  }, [debouncedCrop, debouncedAspectRatio, settings.proxiedImageUrl])

  const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
    setSettings((prev) => ({ ...prev, aspectRatio: ratio }))
  }, [])

  const handleCropChange = useCallback((crop: { x: number; y: number; width: number; height: number } | null) => {
    if (crop) {
      setSettings((prev) => ({ ...prev, crop }))
    }
  }, [])

  const outputDimensions = useMemo(() => {
    const width = 1080
    const height = settings.aspectRatio === "feed" ? 1350 : 1920
    return { width, height }
  }, [settings.aspectRatio])

  const downloadFilename = useMemo(() => {
    const dimensions = settings.aspectRatio === "feed" ? "1080x1350" : "1080x1920"
    return `clickumuarama_${settings.aspectRatio === "feed" ? "feed" : "story"}_${dimensions}.png`
  }, [settings.title, settings.aspectRatio])

  const cropperAspectRatio = useMemo(() => {
    return settings.aspectRatio === "feed" ? 4 / 5 : 9 / 16
  }, [settings.aspectRatio])

  const isAnyDebouncing = useMemo(() => {
    return isCropDebouncing ||
      isAspectRatioDebouncing ||
      isKickerDebouncing ||
      isTitleDebouncing ||
      isKickerBgColorDebouncing ||
      isKickerTextColorDebouncing
  }, [
    isCropDebouncing,
    isAspectRatioDebouncing,
    isKickerDebouncing,
    isTitleDebouncing,
    isKickerBgColorDebouncing,
    isKickerTextColorDebouncing
  ])

  useEffect(() => {
    if (settings.imageUrl) {
      fetchImageThroughProxy(settings.imageUrl)
    }
  }, [settings.imageUrl, fetchImageThroughProxy])

  useEffect(() => {
    if (debouncedCrop && debouncedCrop.width > 0 && debouncedCrop.height > 0 && settings.proxiedImageUrl) {
      generateCroppedImage()
    }
  }, [debouncedCrop, debouncedAspectRatio, settings.proxiedImageUrl, generateCroppedImage])

  useEffect(() => {
    return () => {
      if (settings.croppedImageUrl && settings.croppedImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(settings.croppedImageUrl)
      }
      if (settings.proxiedImageUrl && settings.proxiedImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(settings.proxiedImageUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (settings.croppedImageUrl && settings.croppedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(settings.croppedImageUrl)
    }
    if (settings.proxiedImageUrl && settings.proxiedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(settings.proxiedImageUrl)
    }
    setSettings((prev) => ({ ...prev, croppedImageUrl: null, proxiedImageUrl: null }))
  }, [settings.imageUrl])

  const downloadImage = useCallback(() => {
    if (!settings.finalImageUrl) return

    const a = document.createElement("a")
    a.href = settings.finalImageUrl
    a.download = downloadFilename
    a.click()
  }, [settings.finalImageUrl, downloadFilename])

  const handleImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, imageUrl: e.target.value }))
  }, [])

  const handleKickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, kicker: e.target.value }))
  }, [])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, title: e.target.value }))
  }, [])

  const handleKickerTextColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, kickerTextColor: e.target.value }))
  }, [])

  const handleKickerBgColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, kickerBgColor: e.target.value }))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="h-fit lg:col-span-3">
            <CardHeader>
              <CardTitle>Visualizar imagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[500px] p-4 flex items-center justify-center">
                {settings.proxiedImageUrl ? (
                  <CropperComponent
                    imageUrl={settings.proxiedImageUrl}
                    aspectRatio={cropperAspectRatio}
                    onCropChange={handleCropChange}
                    kicker={settings.kicker}
                    title={settings.title}
                    kickerBgColor={settings.kickerBgColor}
                    kickerTextColor={settings.kickerTextColor}
                    aspectRatioType={settings.aspectRatio}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center text-gray-500">
                      <p>{isProcessing ? "Processando imagem..." : "Carregando imagem..."}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            <Card>
              <CardContent>
                <CardTitle className="pb-4">Modo de exibição</CardTitle>
                <Tabs
                  value={settings.aspectRatio}
                  onValueChange={(value) => handleAspectRatioChange(value as AspectRatio)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="feed">Feed</TabsTrigger>
                    <TabsTrigger value="story">Story</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={settings.imageUrl}
                    onChange={handleImageUrlChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kicker">Chapéu</Label>
                  <Input
                    id="kicker"
                    placeholder="Ex: Urgente"
                    value={settings.kicker}
                    onChange={handleKickerChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kickerTextColor">Cor do Texto</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="kickerTextColor"
                        type="color"
                        value={settings.kickerTextColor}
                        onChange={handleKickerTextColorChange}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kickerBgColor">Cor de Fundo</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="kickerBgColor"
                        type="color"
                        value={settings.kickerBgColor}
                        onChange={handleKickerBgColorChange}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Textarea
                    id="title"
                    placeholder="Digite o título da matéria..."
                    value={settings.title}
                    onChange={handleTitleChange}
                    className="w-full h-28 resize-none"
                  />
                </div>

                <Button
                  onClick={downloadImage}
                  className="w-full"
                  disabled={!settings.finalImageUrl || isProcessing || isAnyDebouncing}
                >
                  {isProcessing || isAnyDebouncing ? "Processando..." : (settings.aspectRatio === "feed" ? "Baixar imagem" : "Baixar story")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {settings.croppedImageUrl && (
            <div className="hidden">
              <CombinedImageGenerator
                croppedImageUrl={settings.croppedImageUrl}
                kicker={settings.kicker}
                title={settings.title}
                kickerBgColor={settings.kickerBgColor}
                kickerTextColor={settings.kickerTextColor}
                aspectRatio={settings.aspectRatio}
                debouncedKicker={debouncedKicker}
                debouncedTitle={debouncedTitle}
                debouncedKickerBgColor={debouncedKickerBgColor}
                debouncedKickerTextColor={debouncedKickerTextColor}
                onFinalImageGenerated={(imageUrl) => setSettings((prev) => ({ ...prev, finalImageUrl: imageUrl }))}
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
