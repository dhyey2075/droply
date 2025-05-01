"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SignOutButton, useUser, UserButton } from '@clerk/nextjs'
import UploadExample from '@/components/FileUpload'
import prettyBytes from 'pretty-bytes'
import { ArrowBigLeft, ExternalLink, File, Folder, FolderPlus, Share2, Trash2Icon, Search, Grid2X2, ListFilter, Loader2, Sun, Moon } from 'lucide-react'
import { Bounce, ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import dateFormat from 'dateformat'
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from 'next-themes'

export interface File {
  id: string
  name: string
  path: string
  size: number
  type: string
  fileUrl: string
  thumbnailUrl: string
  userId: string
  parentId?: string | null
  isFolder: boolean
  isStarred: boolean
  isTrash: boolean
  createdAt: string
  updatedAt: string
}

const Page: React.FC = () => {
  const [media, setMedia] = useState<File[]>([])
  const [folderName, setFolderName] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const uploadRef = useRef<HTMLInputElement>(null)
  const [folderHierarchy, setFolderHierarchy] = useState<[string, string][]>([["00000000-0000-0000-0000-000000000000", "Root"]])
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())

  const { isSignedIn, user } = useUser()
  const { theme, setTheme } = useTheme()

  const fetchUserMedia = useCallback(async () => {
    const response = await fetch('/api/media', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    setMedia(data)
  }, [])

  const notifyError = (message: string) => toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  })

  const notifySuccess = (message: string) => toast.success(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  })

  useEffect(() => {
    fetchUserMedia()
  }, [uploadRef, fetchUserMedia])

  if (!isSignedIn) return null

  const currentFolderId = folderHierarchy[folderHierarchy.length - 1][0]
  const currentFiles = media.filter(item => item.parentId === currentFolderId)

  const handleFileUploadComplete = () => {
    fetchUserMedia()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Droply</h1>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  className="pl-9 w-[300px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <ListFilter className="h-5 w-5" /> : <Grid2X2 className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark')
                }}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {folderHierarchy.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFolderHierarchy(prev => prev.slice(0, prev.length - 1))
                  fetchUserMedia()
                }}
              >
                <ArrowBigLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {folderHierarchy.map((item, idx) => (
                <React.Fragment key={item[0]}>
                  {idx > 0 && <span>/</span>}
                  <span className={idx === folderHierarchy.length - 1 ? "font-medium text-foreground" : ""}>
                    {item[1]}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-[200px]"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  if (!folderName.trim()) return
                  const response = await fetch('/api/folders/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: folderName,
                      userId: user.id,
                      parentId: currentFolderId,
                    }),
                  })
                  const data = await response.json()
                  if (data.success) {
                    setFolderName('')
                    fetchUserMedia()
                    notifySuccess("Folder created successfully")
                  } else {
                    notifyError(data.message)
                  }
                }}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>

            <UploadExample 
              fileInputRef={uploadRef} 
              parentId={currentFolderId} 
              onUploadComplete={handleFileUploadComplete}
            />
          </div>
        </div>

        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-2"}>
          {currentFiles.map(item => (
            <Card key={item.id} className={`${viewMode === 'grid' ? '' : 'p-4'} hover:shadow-md transition-shadow`}>
              <CardContent className={`${viewMode === 'grid' ? 'p-4' : 'p-0'}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {item.isFolder ? (
                      <Folder className="h-10 w-10 text-blue-500" />
                    ) : (
                      <File className="h-10 w-10 text-gray-500" />
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`truncate ${item.isFolder ? 'cursor-pointer hover:text-blue-500' : ''}`}
                        onClick={() => {
                          if (item.isFolder) {
                            setFolderHierarchy(prev => [...prev, [item.id, item.name]])
                            fetchUserMedia()
                          }
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!item.isFolder && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(item.fileUrl)
                                notifySuccess("File URL copied to clipboard")
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(item.fileUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          disabled={deletingFiles.has(item.id)}
                          onClick={async () => {
                            try {
                              setDeletingFiles(prev => new Set(prev).add(item.id))
                              const endpoint = item.isFolder ? '/api/folders/delete' : '/api/delete-media'
                              const response = await fetch(endpoint, {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  fileId: item.id,
                                  userId: user.id,
                                }),
                              })
                              const data = await response.json()
                              if (data.message) {
                                fetchUserMedia()
                                notifySuccess(`${item.isFolder ? 'Folder' : 'File'} deleted successfully`)
                              } else {
                                notifyError(data.message)
                              }
                            } finally {
                              setDeletingFiles(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(item.id)
                                return newSet
                              })
                            }
                          }}
                        >
                          {deletingFiles.has(item.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {!item.isFolder && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{prettyBytes(item.size)}</span>
                        <span>·</span>
                        <span>{dateFormat(item.createdAt, "mmm d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      
      <ToastContainer />
    </div>
  )
}

export default Page