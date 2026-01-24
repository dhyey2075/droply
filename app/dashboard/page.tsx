"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import UploadExample from '@/components/FileUpload'
import prettyBytes from 'pretty-bytes'
import { ArrowLeft, ExternalLink, File, Folder, FolderPlus, Share2, Trash2Icon, Grid2X2, ListFilter, Loader2, Pencil, FolderOpen, Sun, Moon, Monitor } from 'lucide-react'
import { getClassWithColor } from 'file-icons-js'
import 'file-icons-js/css/style.css'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [folderHierarchy, setFolderHierarchy] = useState<[string, string][]>([["00000000-0000-0000-0000-000000000000", ""]])
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [renamingFile, setRenamingFile] = useState<File | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState<boolean>(false)
  const [newFileName, setNewFileName] = useState<string>('')
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false)

  const { isSignedIn, user } = useUser()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchUserMedia = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/media', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      setMedia(data)
    } catch (error) {
      notifyError('Failed to fetch files')
    } finally {
      setIsLoading(false)
    }
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

  const getFileIconClass = (fileName: string): string => {
    const iconClass = getClassWithColor(fileName)
    return iconClass || 'text-icon'
  }

  const handleRename = async () => {
    if (!renamingFile || !newFileName.trim() || newFileName.trim() === renamingFile.name || isRenaming) return

    setIsRenaming(true)
    try {
      const response = await fetch('/api/rename', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: renamingFile.id,
          newName: newFileName.trim(),
          userId: user?.id,
        }),
      })
      const data = await response.json()
      if (data.success) {
        fetchUserMedia()
        // Update folder hierarchy if renaming a folder in the path
        if (renamingFile.isFolder) {
          setFolderHierarchy(prev => 
            prev.map(([id, name]) => 
              id === renamingFile.id ? [id, newFileName.trim()] : [id, name]
            )
          )
        }
        notifySuccess(data.message)
        setRenameDialogOpen(false)
        setRenamingFile(null)
        setNewFileName('')
      } else {
        notifyError(data.message || 'Failed to rename')
      }
    } catch (error) {
      notifyError('Failed to rename')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Droply</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-accent hover:scale-105 transition-all duration-200 touch-manipulation"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <ListFilter className="h-4 w-4 sm:h-5 sm:w-5" /> : <Grid2X2 className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-accent hover:scale-105 transition-all duration-200 touch-manipulation"
                  onClick={() => {
                    if (theme === 'light') {
                      setTheme('dark')
                    } else if (theme === 'dark') {
                      setTheme('system')
                    } else {
                      setTheme('light')
                    }
                  }}
                  title={`Theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
                >
                  {theme === 'light' ? (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : theme === 'dark' ? (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              )}
              <div className="hidden sm:block">
                <UserButton />
              </div>
              <div className="sm:hidden">
                <UserButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            {folderHierarchy.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-accent hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 touch-manipulation"
                onClick={() => {
                  setFolderHierarchy(prev => prev.slice(0, prev.length - 1))
                  fetchUserMedia()
                }}
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-x-auto scrollbar-hide">
              {folderHierarchy.map((item, idx) => {
                const isLast = idx === folderHierarchy.length - 1
                const isRoot = item[0] === "00000000-0000-0000-0000-000000000000"
                const displayName = isRoot ? "" : (item[1] || "")
                
                return (
                  <React.Fragment key={item[0]}>
                    {idx > 0 && <span className="text-muted-foreground flex-shrink-0">/</span>}
                    {isLast ? (
                      <span className="font-medium text-foreground truncate">
                        {displayName}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setFolderHierarchy(prev => prev.slice(0, idx + 1))
                          fetchUserMedia()
                        }}
                        className="px-1.5 sm:px-2 py-1 rounded-md hover:bg-accent hover:text-foreground transition-all duration-200 font-medium hover:scale-105 whitespace-nowrap touch-manipulation"
                      >
                        {displayName}
                      </button>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Input
                placeholder="New folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="flex-1 sm:w-[200px] text-sm sm:text-base"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:border-blue-800 dark:hover:text-blue-400 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 touch-manipulation"
                onClick={async () => {
                  if (!folderName.trim() || isCreatingFolder) return
                  setIsCreatingFolder(true)
                  try {
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
                  } catch (error) {
                    notifyError('Failed to create folder')
                  } finally {
                    setIsCreatingFolder(false)
                  }
                }}
                disabled={isCreatingFolder}
                title="Create folder"
              >
                {isCreatingFolder ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>

            <div className="flex-shrink-0">
              <UploadExample 
                fileInputRef={uploadRef} 
                parentId={currentFolderId} 
                onUploadComplete={handleFileUploadComplete}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={isMobile ? "space-y-2" : (viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4" : "space-y-2")}>
            {[...Array(6)].map((_, index) => (
              <Card key={index} className={`${isMobile || viewMode === 'list' ? 'p-3 sm:p-4' : ''} animate-pulse`}>
                <CardContent className={`${isMobile || viewMode === 'list' ? 'p-0' : 'p-3 sm:p-4'}`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted rounded-lg"></div>
                    </div>
                    <div className="flex-grow min-w-0 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-9 h-9 sm:w-8 sm:h-8 bg-muted rounded-lg"></div>
                      <div className="w-9 h-9 sm:w-8 sm:h-8 bg-muted rounded-lg"></div>
                      <div className="w-9 h-9 sm:w-8 sm:h-8 bg-muted rounded-lg"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : currentFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <FolderOpen className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mb-3 sm:mb-4 opacity-50" />
            <p className="text-base sm:text-lg font-medium text-foreground mb-1 sm:mb-2">This folder is empty</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Upload files or create a folder to get started</p>
          </div>
        ) : (
          <div className={isMobile ? "space-y-2" : (viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4" : "space-y-2")}>
            {currentFiles.map(item => (
            <Card key={item.id} className={`${isMobile || viewMode === 'list' ? 'p-3 sm:p-4' : ''} hover:shadow-md transition-shadow`}>
              <CardContent className={`${isMobile || viewMode === 'list' ? 'p-0' : 'p-3 sm:p-4'}`}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14">
                    {item.isFolder ? (
                      <Folder className="h-12 w-12 sm:h-14 sm:w-14 text-blue-500" />
                    ) : (
                      <i className={`${getFileIconClass(item.name)} file-icon-large`}></i>
                    )}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`truncate text-sm sm:text-base ${item.isFolder ? 'cursor-pointer hover:text-blue-500 active:text-blue-600' : ''} touch-manipulation`}
                        onClick={() => {
                          if (item.isFolder) {
                            setFolderHierarchy(prev => [...prev, [item.id, item.name]])
                            fetchUserMedia()
                          }
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all duration-200 touch-manipulation"
                          onClick={() => {
                            setRenamingFile(item)
                            setNewFileName(item.name)
                            setRenameDialogOpen(true)
                          }}
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!item.isFolder && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30 dark:hover:text-green-400 transition-all duration-200 touch-manipulation"
                              onClick={() => {
                                navigator.clipboard.writeText(item.fileUrl)
                                notifySuccess("File URL copied to clipboard")
                              }}
                              title="Copy link"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/30 dark:hover:text-purple-400 transition-all duration-200 touch-manipulation"
                              onClick={() => window.open(item.fileUrl, '_blank')}
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all duration-200 touch-manipulation"
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
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                        <span>{prettyBytes(item.size)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">{dateFormat(item.createdAt, "mmm d, yyyy")}</span>
                        <span className="sm:hidden">{dateFormat(item.createdAt, "mm/dd/yy")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </main>
      
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renamingFile?.isFolder ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Enter a new name for {renamingFile?.isFolder ? 'this folder' : 'this file'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg hover:scale-105 transition-all duration-200"
              onClick={() => {
                setRenameDialogOpen(false)
                setRenamingFile(null)
                setNewFileName('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newFileName.trim() || newFileName.trim() === renamingFile?.name || isRenaming}
              className="rounded-lg hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isRenaming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ToastContainer />
    </div>
  )
}

export default Page