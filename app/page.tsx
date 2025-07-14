/* biome-ignore-all lint/correctness/useExhaustiveDependencies: too much useEffect to do individualy. some dependencies aren't added 'cause it isn't needed. */
'use client'

import { ExternalLink } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CombinedImageGenerator } from '@/components/combined-image-generator'
import { CropperComponent } from '@/components/cropper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebounceWithState } from '@/lib/utils'

type AspectRatio = 'feed' | 'story'

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
	const imgParam = searchParams.get('img')
	const kickerParam = searchParams.get('kicker')
	const titleParam = searchParams.get('title')
	const kickerBgColorParam = searchParams.get('kickerBg')
	const kickerTextColorParam = searchParams.get('kickerColor')

	const [settings, setSettings] = useState<CropSettings>({
		imageUrl: imgParam ?? '',
		kicker: kickerParam ?? '',
		kickerBgColor: kickerBgColorParam ?? '#D9D9D9',
		kickerTextColor: kickerTextColorParam ?? '#000000',
		title: titleParam ?? '',
		aspectRatio: 'feed',
		crop: {
			x: 0,
			y: 0,
			width: 400,
			height: 500
		},
		croppedImageUrl: null,
		finalImageUrl: null,
		proxiedImageUrl: null
	})

	const [isProcessing, setIsProcessing] = useState(false)
	const [isTextGenerating, setIsTextGenerating] = useState(false)

	const prevCropRef = useRef(settings.crop)
	const prevAspectRatioRef = useRef(settings.aspectRatio)
	const prevProxiedImageUrlRef = useRef<string | null>(null)

	const [debouncedCrop] = useDebounceWithState(settings.crop, 750)
	const [debouncedAspectRatio] = useDebounceWithState(settings.aspectRatio, 750)
	const [debouncedKicker] = useDebounceWithState(settings.kicker, 300)
	const [debouncedTitle] = useDebounceWithState(settings.title, 300)
	const [debouncedKickerBgColor] = useDebounceWithState(
		settings.kickerBgColor,
		300
	)
	const [debouncedKickerTextColor] = useDebounceWithState(
		settings.kickerTextColor,
		300
	)

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

			setSettings(prev => ({ ...prev, proxiedImageUrl: blobUrl }))
		} catch (error) {
			console.error('Error fetching image through proxy:', error)
		} finally {
			setIsProcessing(false)
		}
	}, [])

	const generateCroppedImage = useCallback(async () => {
		const imageUrlToUse =
			settings.proxiedImageUrl ||
			(settings.imageUrl?.startsWith('blob:') ? settings.imageUrl : null)

		if (!debouncedCrop || !imageUrlToUse) return

		const prevCrop = prevCropRef.current
		const hasCropChanged =
			prevCrop.x !== debouncedCrop.x ||
			prevCrop.y !== debouncedCrop.y ||
			prevCrop.width !== debouncedCrop.width ||
			prevCrop.height !== debouncedCrop.height

		const hasAspectRatioChanged =
			prevAspectRatioRef.current !== debouncedAspectRatio

		const hasImageChanged = prevProxiedImageUrlRef.current !== imageUrlToUse

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
				const outputHeight = debouncedAspectRatio === 'feed' ? 1350 : 1920

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

				canvas.toBlob(blob => {
					if (blob) {
						if (settings.croppedImageUrl?.startsWith('blob:')) {
							URL.revokeObjectURL(settings.croppedImageUrl)
						}

						const croppedImageUrl = URL.createObjectURL(blob)
						setSettings(prev => ({ ...prev, croppedImageUrl }))

						prevCropRef.current = debouncedCrop
						prevAspectRatioRef.current = debouncedAspectRatio
						prevProxiedImageUrlRef.current = imageUrlToUse
					}
				}, 'image/png')
			}

			img.onerror = () => {
				throw new Error('Failed to load image')
			}

			img.src = imageUrlToUse
		} catch (error) {
			console.error('Error generating cropped image:', error)
		} finally {
			setIsProcessing(false)
		}
	}, [
		debouncedCrop,
		debouncedAspectRatio,
		settings.proxiedImageUrl,
		settings.imageUrl
	])

	const handleAspectRatioChange = useCallback((ratio: AspectRatio) => {
		setSettings(prev => ({ ...prev, aspectRatio: ratio }))
	}, [])

	const handleCropChange = useCallback(
		(crop: { x: number; y: number; width: number; height: number } | null) => {
			if (crop) {
				setSettings(prev => ({ ...prev, crop }))
			}
		},
		[]
	)

	const downloadFilename = useMemo(() => {
		const dimensions =
			settings.aspectRatio === 'feed' ? '1080x1350' : '1080x1920'
		return `clickumuarama_${settings.aspectRatio === 'feed' ? 'feed' : 'story'}_${dimensions}.png`
	}, [settings.title, settings.aspectRatio])

	const cropperAspectRatio = useMemo(() => {
		return settings.aspectRatio === 'feed' ? 4 / 5 : 9 / 16
	}, [settings.aspectRatio])

	const isAnyProcessing = useMemo(() => {
		return isProcessing || isTextGenerating
	}, [isProcessing, isTextGenerating])

	useEffect(() => {
		if (settings.imageUrl) {
			if (settings.imageUrl.startsWith('blob:')) {
				setSettings(prev => ({ ...prev, proxiedImageUrl: settings.imageUrl }))
			} else {
				fetchImageThroughProxy(settings.imageUrl)
			}
		} else {
			setSettings(prev => ({ ...prev, proxiedImageUrl: null }))
		}
	}, [settings.imageUrl, fetchImageThroughProxy])

	useEffect(() => {
		const hasImageUrl =
			settings.proxiedImageUrl || settings.imageUrl?.startsWith('blob:')

		if (
			debouncedCrop &&
			debouncedCrop.width > 0 &&
			debouncedCrop.height > 0 &&
			hasImageUrl
		) {
			generateCroppedImage()
		}
	}, [
		debouncedCrop,
		debouncedAspectRatio,
		settings.proxiedImageUrl,
		settings.imageUrl,
		generateCroppedImage
	])

	useEffect(() => {
		return () => {
			if (settings.croppedImageUrl?.startsWith('blob:')) {
				URL.revokeObjectURL(settings.croppedImageUrl)
			}
			if (settings.proxiedImageUrl?.startsWith('blob:')) {
				URL.revokeObjectURL(settings.proxiedImageUrl)
			}
		}
	}, [])

	useEffect(() => {
		if (settings.croppedImageUrl?.startsWith('blob:')) {
			URL.revokeObjectURL(settings.croppedImageUrl)
		}
		if (settings.proxiedImageUrl?.startsWith('blob:')) {
			URL.revokeObjectURL(settings.proxiedImageUrl)
		}
		if (settings.imageUrl?.startsWith('blob:')) {
			URL.revokeObjectURL(settings.imageUrl)
		}
		setSettings(prev => ({
			...prev,
			croppedImageUrl: null,
			proxiedImageUrl: null
		}))
	}, [settings.imageUrl])

	const downloadImage = useCallback(() => {
		if (!settings.finalImageUrl) return

		const a = document.createElement('a')
		a.href = settings.finalImageUrl
		a.download = downloadFilename
		a.click()
	}, [settings.finalImageUrl, downloadFilename])

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) {
				const fileUrl = URL.createObjectURL(file)
				setSettings(prev => ({ ...prev, imageUrl: fileUrl }))
			}
		},
		[]
	)

	const handleKickerChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSettings(prev => ({ ...prev, kicker: e.target.value }))
		},
		[]
	)

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setSettings(prev => ({ ...prev, title: e.target.value }))
		},
		[]
	)

	const handleKickerTextColorChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSettings(prev => ({ ...prev, kickerTextColor: e.target.value }))
		},
		[]
	)

	const handleKickerBgColorChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSettings(prev => ({ ...prev, kickerBgColor: e.target.value }))
		},
		[]
	)

	const handleOpenImageUrl = useCallback(() => {
		if (imgParam) {
			window.open(imgParam, '_blank')
		}
	}, [imgParam])

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
								{settings.proxiedImageUrl ||
								settings.imageUrl?.startsWith('blob:') ? (
									<CropperComponent
										imageUrl={settings.proxiedImageUrl || settings.imageUrl}
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
											<p>
												{isProcessing
													? 'Processando imagem...'
													: 'Insira uma imagem.'}
											</p>
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
									onValueChange={value =>
										handleAspectRatioChange(value as AspectRatio)
									}
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
								{!imgParam && (
									<div className="space-y-2">
										<Label htmlFor="imageFile">Selecionar Imagem</Label>
										<Input
											id="imageFile"
											type="file"
											accept="image/*"
											onChange={handleFileChange}
											className="cursor-pointer"
										/>
									</div>
								)}

								{imgParam && (
									<div className="space-y-2">
										<Label>URL da Imagem</Label>
										<div className="flex items-center justify-between p-1 border rounded-md h-9 bg-gray-50">
											<p className="text-sm text-gray-700 truncate flex-1 mr-2">
												{imgParam}
											</p>
											<Button
												variant="ghost"
												size="sm"
												onClick={handleOpenImageUrl}
												className="shrink-0 hover:bg-gray-200 hover:cursor-pointer transition-colors duration-150 delay-100 ease-linear"
											>
												<ExternalLink className="size-4" />
											</Button>
										</div>
									</div>
								)}

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
									disabled={!settings.finalImageUrl || isAnyProcessing}
								>
									{isAnyProcessing
										? 'Processando...'
										: settings.aspectRatio === 'feed'
											? 'Baixar imagem'
											: 'Baixar story'}
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
								onFinalImageGenerated={imageUrl =>
									setSettings(prev => ({ ...prev, finalImageUrl: imageUrl }))
								}
								onGeneratingChange={setIsTextGenerating}
								className="w-full h-full"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
