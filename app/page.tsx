"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CropperComponent } from "@/components/cropper"
import { CombinedImageGenerator } from "@/components/combined-image-generator"

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
  const [settings, setSettings] = useState<CropSettings>({
    imageUrl: "https://clickumuarama.com.br/wp-content/uploads/2025/06/DSC04253.jpg",
    kicker: "",
    kickerBgColor: "#D4D4D4",
    kickerTextColor: "#000000",
    title: "",
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

  const fetchImageThroughProxy = useCallback(async (imageUrl: string) => {
    try {
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
    }
  }, [])

  const generateCroppedImage = useCallback(async () => {
    if (!settings.crop || !settings.proxiedImageUrl) return

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const outputWidth = 1080
        const outputHeight = settings.aspectRatio === "feed" ? 1350 : 1920

        canvas.width = outputWidth
        canvas.height = outputHeight

        ctx.drawImage(
          img,
          settings.crop.x,
          settings.crop.y,
          settings.crop.width,
          settings.crop.height,
          0,
          0,
          outputWidth,
          outputHeight
        )

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedImageUrl = URL.createObjectURL(blob)
            setSettings((prev) => ({ ...prev, croppedImageUrl }))
          }
        }, 'image/png')
      }

      img.onerror = () => {
        throw new Error('Failed to load image')
      }

      img.src = settings.proxiedImageUrl
    } catch (error) {
      console.error("Error generating cropped image:", error)
    }
  }, [settings.crop, settings.proxiedImageUrl, settings.aspectRatio])

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    setSettings((prev) => ({ ...prev, aspectRatio: ratio }))
  }

  const handleCropChange = useCallback((crop: { x: number; y: number; width: number; height: number } | null) => {
    if (crop) {
      setSettings((prev) => ({ ...prev, crop }))
    }
  }, [])

  useEffect(() => {
    if (settings.imageUrl) {
      fetchImageThroughProxy(settings.imageUrl)
    }
  }, [settings.imageUrl, fetchImageThroughProxy])

  useEffect(() => {
    if (settings.crop && settings.crop.width > 0 && settings.crop.height > 0 && settings.proxiedImageUrl) {
      generateCroppedImage()
    }
  }, [settings.crop, settings.proxiedImageUrl, generateCroppedImage])

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
    if (settings.croppedImageUrl) {
      URL.revokeObjectURL(settings.croppedImageUrl)
    }
    if (settings.proxiedImageUrl) {
      URL.revokeObjectURL(settings.proxiedImageUrl)
    }
    setSettings((prev) => ({ ...prev, croppedImageUrl: null, proxiedImageUrl: null }))
  }, [settings.imageUrl])

  const downloadImage = useCallback(() => {
    if (!settings.finalImageUrl) {
      alert("Por favor, adicione uma URL de imagem, faça o crop e adicione texto primeiro.")
      return
    }

    const a = document.createElement("a")
    a.href = settings.finalImageUrl
    const dimensions = settings.aspectRatio === "feed" ? "1080x1350" : "1080x1920"
    const filename = settings.title.trim()
      ? `${settings.title.trim()}_${dimensions}.png`
      : `${settings.aspectRatio === "feed" ? "feed" : "story"}_${dimensions}.png`
    a.download = filename
    a.click()
  }, [settings.finalImageUrl, settings.title, settings.aspectRatio])

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
                    aspectRatio={settings.aspectRatio === "feed" ? 4 / 5 : 9 / 16}
                    onCropChange={handleCropChange}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center text-gray-500">
                      <p>Carregando imagem...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Modo de exibição</CardTitle>
              </CardHeader>
              <CardContent>
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
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={settings.imageUrl}
                    onChange={(e) => setSettings((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kicker">Chapéu</Label>
                  <Input
                    id="kicker"
                    placeholder="Ex: Urgente"
                    value={settings.kicker}
                    onChange={(e) => setSettings((prev) => ({ ...prev, kicker: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kickerTextColor">Cor do Texto do Chapéu</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="kickerTextColor"
                        type="color"
                        value={settings.kickerTextColor}
                        onChange={(e) => setSettings((prev) => ({ ...prev, kickerTextColor: e.target.value }))}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kickerBgColor">Cor de Fundo do Chapéu</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="kickerBgColor"
                        type="color"
                        value={settings.kickerBgColor}
                        onChange={(e) => setSettings((prev) => ({ ...prev, kickerBgColor: e.target.value }))}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Digite o título da matéria..."
                    value={settings.title}
                    onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={downloadImage}
                  className="w-full"
                  disabled={!settings.finalImageUrl}
                >
                  {settings.aspectRatio === "feed" ? "Baixar imagem" : "Baixar story"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {settings.croppedImageUrl && (
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Preview Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <CombinedImageGenerator
                    croppedImageUrl={settings.croppedImageUrl}
                    kicker={settings.kicker}
                    title={settings.title}
                    kickerBgColor={settings.kickerBgColor}
                    kickerTextColor={settings.kickerTextColor}
                    aspectRatio={settings.aspectRatio}
                    onFinalImageGenerated={(imageUrl) => setSettings((prev) => ({ ...prev, finalImageUrl: imageUrl }))}
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
