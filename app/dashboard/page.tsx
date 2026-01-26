"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import UploadExample from '@/components/FileUpload'
import prettyBytes from 'pretty-bytes'
import { ArrowLeft, ExternalLink, File, Folder, FolderPlus, Share2, Trash2Icon, Grid2X2, ListFilter, Loader2, Pencil, FolderOpen, Sun, Moon, Monitor, Cloud } from 'lucide-react'
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
import { UserProfileMenu } from "@/components/UserProfileMenu"

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
  gdriveId?: string
  gdriveParents?: string[]
  onedriveId?: string
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
  const [fileExtension, setFileExtension] = useState<string>('')
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false)
  const [activeSource, setActiveSource] = useState<'droply' | 'gdrive' | 'onedrive'>('droply')
  const [isGDriveConnected, setIsGDriveConnected] = useState<boolean>(false)
  const [gDriveFiles, setGDriveFiles] = useState<File[]>([])
  const [gDriveFolderHierarchy, setGDriveFolderHierarchy] = useState<[string, string][]>([["root", "Google Drive"]])
  const [isLoadingGDrive, setIsLoadingGDrive] = useState<boolean>(false)
  const [isOneDriveConnected, setIsOneDriveConnected] = useState<boolean>(false)
  const [oneDriveFiles, setOneDriveFiles] = useState<File[]>([])
  const [oneDriveFolderHierarchy, setOneDriveFolderHierarchy] = useState<[string, string][]>([["root", "OneDrive"]])
  const [isLoadingOneDrive, setIsLoadingOneDrive] = useState<boolean>(false)

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

  const notifyError = useCallback((message: string) => toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  }), [])

  const notifySuccess = useCallback((message: string) => toast.success(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
    transition: Bounce,
  }), [])

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
      console.error('Error fetching files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [notifyError])

  const checkGDriveStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gdrive/status')
      const data = await response.json()
      if (data.connected) {
        setIsGDriveConnected(true)
      }
    } catch (error) {
      console.error('Error checking Google Drive status:', error)
    }
  }, [])

  const checkOneDriveStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/onedrive/status')
      const data = await response.json()
      if (data.connected) {
        setIsOneDriveConnected(true)
      }
    } catch (error) {
      console.error('Error checking OneDrive status:', error)
    }
  }, [])

  const fetchGDriveFiles = useCallback(async (folderId: string = "root") => {
    if (!isGDriveConnected) return
    
    setIsLoadingGDrive(true)
    try {
      const response = await fetch(`/api/gdrive/files?folderId=${folderId}`)
      const data = await response.json()
      if (data.files) {
        setGDriveFiles(data.files)
      } else if (data.error) {
        notifyError(data.error)
        if (data.error.includes('not connected') || data.error.includes('expired')) {
          setIsGDriveConnected(false)
        }
      }
    } catch (error) {
      console.error('Error fetching Google Drive files:', error)
      notifyError('Failed to fetch Google Drive files')
    } finally {
      setIsLoadingGDrive(false)
    }
  }, [isGDriveConnected, notifyError])

  const fetchOneDriveFiles = useCallback(async (folderId: string = "root") => {
    if (!isOneDriveConnected) return
    
    setIsLoadingOneDrive(true)
    try {
      const response = await fetch(`/api/onedrive/files?folderId=${folderId}`)
      const data = await response.json()
      if (data.files) {
        setOneDriveFiles(data.files)
      } else if (data.error) {
        notifyError(data.error)
        if (data.error.includes('not connected') || data.error.includes('expired')) {
          setIsOneDriveConnected(false)
        }
      }
    } catch (error) {
      console.error('Error fetching OneDrive files:', error)
      notifyError('Failed to fetch OneDrive files')
    } finally {
      setIsLoadingOneDrive(false)
    }
  }, [isOneDriveConnected, notifyError])

  useEffect(() => {
    fetchUserMedia()
    checkGDriveStatus()
    checkOneDriveStatus()
  }, [fetchUserMedia, checkGDriveStatus, checkOneDriveStatus])

  useEffect(() => {
    // Check for OAuth callback success
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('gdrive_connected') === 'true') {
      setIsGDriveConnected(true)
      notifySuccess('Google Drive connected successfully')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
    if (urlParams.get('onedrive_connected') === 'true') {
      setIsOneDriveConnected(true)
      notifySuccess('OneDrive connected successfully')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
    
    if (activeSource === 'gdrive' && isGDriveConnected) {
      const currentFolderId = gDriveFolderHierarchy[gDriveFolderHierarchy.length - 1][0]
      fetchGDriveFiles(currentFolderId)
    }
    if (activeSource === 'onedrive' && isOneDriveConnected) {
      const currentFolderId = oneDriveFolderHierarchy[oneDriveFolderHierarchy.length - 1][0]
      fetchOneDriveFiles(currentFolderId)
    }
  }, [activeSource, isGDriveConnected, isOneDriveConnected, fetchGDriveFiles, fetchOneDriveFiles, gDriveFolderHierarchy, oneDriveFolderHierarchy, notifySuccess])

  if (!isSignedIn) return null

  const currentFolderId = folderHierarchy[folderHierarchy.length - 1][0]
  const droplyFiles = media.filter(item => item.parentId === currentFolderId)
  const currentFiles = activeSource === 'droply' 
    ? droplyFiles 
    : activeSource === 'gdrive' 
      ? gDriveFiles 
      : oneDriveFiles
  const isLoadingFiles = activeSource === 'droply' 
    ? isLoading 
    : activeSource === 'gdrive' 
      ? isLoadingGDrive 
      : isLoadingOneDrive

  const handleFileUploadComplete = () => {
    fetchUserMedia()
  }

  const getFileIconClass = (fileName: string): string => {
    const iconClass = getClassWithColor(fileName)
    return iconClass || 'text-icon'
  }

  const handleGDriveConnect = async () => {
    try {
      const response = await fetch('/api/gdrive/auth')
      const data = await response.json()
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        notifyError('Failed to initiate Google Drive connection')
      }
    } catch (error) {
      console.error('Error connecting to Google Drive:', error)
      notifyError('Failed to connect to Google Drive')
    }
  }

  const handleOneDriveConnect = async () => {
    try {
      const response = await fetch('/api/onedrive/auth')
      const data = await response.json()
      if (data.authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl
      } else {
        notifyError('Failed to initiate OneDrive connection')
      }
    } catch (error) {
      console.error('Error connecting to OneDrive:', error)
      notifyError('Failed to connect to OneDrive')
    }
  }

  const handleRename = async () => {
    if (!renamingFile || !newFileName.trim() || isRenaming) return

    // For files, ensure the extension is preserved
    let finalName = newFileName.trim()
    if (!renamingFile.isFolder && fileExtension) {
      // Remove any extension the user might have added and append the original extension
      const nameWithoutExt = finalName.replace(/\.[^.]*$/, '')
      finalName = nameWithoutExt + fileExtension
    }

    // Check if the name actually changed
    if (finalName === renamingFile.name) return

    setIsRenaming(true)
    try {
      const response = await fetch('/api/rename', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: renamingFile.id,
          newName: finalName,
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
              id === renamingFile.id ? [id, finalName] : [id, name]
            )
          )
        }
        notifySuccess(data.message)
        setRenameDialogOpen(false)
        setRenamingFile(null)
        setNewFileName('')
        setFileExtension('')
      } else {
        notifyError(data.message || 'Failed to rename')
      }
    } catch {
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
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Droply</h1>
              
              {/* Source Tabs */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-2 sm:ml-4">
                <button
                  onClick={() => setActiveSource('droply')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm font-medium transition-all duration-200 touch-manipulation ${
                    activeSource === 'droply'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Droply
                </button>
                <button
                  onClick={() => {
                    if (!isGDriveConnected) {
                      handleGDriveConnect()
                    } else {
                      setActiveSource('gdrive')
                    }
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-sm font-medium transition-all duration-200 touch-manipulation flex items-center gap-1.5 ${
                    activeSource === 'gdrive'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <img src="https://static.vecteezy.com/system/resources/previews/022/484/494/non_2x/google-drive-icon-logo-symbol-free-png.png" alt="Google Drive" className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ width: '16px', height: '16px' }} />
                  {!isGDriveConnected && (
                    <span className="ml-1 text-xs text-muted-foreground">(Connect)</span>
                  )}
                </button>
              </div>
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
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {activeSource === 'gdrive' && !isGDriveConnected ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Cloud className="h-20 w-20 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg sm:text-xl font-medium text-foreground mb-2">Connect Google Drive</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Connect your Google Drive account to access and manage your files from one place.
            </p>
            <Button
              onClick={handleGDriveConnect}
              className="rounded-lg hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg font-medium gap-2"
            >
              <Cloud className="h-4 w-4" />
              Connect Google Drive
            </Button>
          </div>
        ) : activeSource === 'onedrive' && !isOneDriveConnected ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <img src="https://img.icons8.com/color/96/onedrive.png" alt="OneDrive" className="h-20 w-20 mb-4 opacity-50" />
            <p className="text-lg sm:text-xl font-medium text-foreground mb-2">Connect OneDrive</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Connect your OneDrive account to access and manage your files from one place.
            </p>
            <Button
              onClick={handleOneDriveConnect}
              className="rounded-lg hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg font-medium gap-2"
            >
              <img src="https://img.icons8.com/fluent/1200/microsoft-onedrive-2025.jpg" alt="OneDrive" className="h-4 w-4" />
              Connect OneDrive
            </Button>
          </div>
        ) : (
          <>
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          {activeSource === 'droply' && (
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
          )}
          {activeSource === 'gdrive' && (
            <div className="flex items-center gap-2 min-w-0">
              {gDriveFolderHierarchy.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-accent hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 touch-manipulation"
                  onClick={() => {
                    setGDriveFolderHierarchy(prev => prev.slice(0, prev.length - 1))
                    const newFolderId = gDriveFolderHierarchy[gDriveFolderHierarchy.length - 2][0]
                    fetchGDriveFiles(newFolderId)
                  }}
                  title="Go back"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-x-auto scrollbar-hide">
                {gDriveFolderHierarchy.map((item, idx) => {
                  const isLast = idx === gDriveFolderHierarchy.length - 1
                  
                  return (
                    <React.Fragment key={item[0]}>
                      {idx > 0 && <span className="text-muted-foreground flex-shrink-0">/</span>}
                      {isLast ? (
                        <span className="font-medium text-foreground truncate">
                          {item[1]}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setGDriveFolderHierarchy(prev => prev.slice(0, idx + 1))
                            fetchGDriveFiles(item[0])
                          }}
                          className="px-1.5 sm:px-2 py-1 rounded-md hover:bg-accent hover:text-foreground transition-all duration-200 font-medium hover:scale-105 whitespace-nowrap touch-manipulation"
                        >
                          {item[1]}
                        </button>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
          {activeSource === 'onedrive' && (
            <div className="flex items-center gap-2 min-w-0">
              {oneDriveFolderHierarchy.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-accent hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 touch-manipulation"
                  onClick={() => {
                    setOneDriveFolderHierarchy(prev => prev.slice(0, prev.length - 1))
                    const newFolderId = oneDriveFolderHierarchy[oneDriveFolderHierarchy.length - 2][0]
                    fetchOneDriveFiles(newFolderId)
                  }}
                  title="Go back"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground min-w-0 overflow-x-auto scrollbar-hide">
                {oneDriveFolderHierarchy.map((item, idx) => {
                  const isLast = idx === oneDriveFolderHierarchy.length - 1
                  
                  return (
                    <React.Fragment key={item[0]}>
                      {idx > 0 && <span className="text-muted-foreground flex-shrink-0">/</span>}
                      {isLast ? (
                        <span className="font-medium text-foreground truncate">
                          {item[1]}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setOneDriveFolderHierarchy(prev => prev.slice(0, idx + 1))
                            fetchOneDriveFiles(item[0])
                          }}
                          className="px-1.5 sm:px-2 py-1 rounded-md hover:bg-accent hover:text-foreground transition-all duration-200 font-medium hover:scale-105 whitespace-nowrap touch-manipulation"
                        >
                          {item[1]}
                        </button>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {activeSource === 'droply' && (
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
                    } catch {
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
          )}
        </div>

        {isLoadingFiles ? (
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
            <p className="text-base sm:text-lg font-medium text-foreground mb-1 sm:mb-2">
              {activeSource === 'gdrive' 
                ? 'No files in Google Drive' 
                : activeSource === 'onedrive'
                  ? 'No files in OneDrive'
                  : 'This folder is empty'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeSource === 'gdrive' 
                ? 'Files from your Google Drive will appear here' 
                : activeSource === 'onedrive'
                  ? 'Files from your OneDrive will appear here'
                  : 'Upload files or create a folder to get started'}
            </p>
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
                            if (activeSource === 'droply') {
                              setFolderHierarchy(prev => [...prev, [item.id, item.name]])
                              fetchUserMedia()
                            } else if (activeSource === 'gdrive') {
                              // Handle Google Drive folder navigation
                              const gdriveId = item.gdriveId || item.id
                              setGDriveFolderHierarchy(prev => [...prev, [gdriveId, item.name]])
                              fetchGDriveFiles(gdriveId)
                            } else if (activeSource === 'onedrive') {
                              // Handle OneDrive folder navigation
                              const onedriveId = item.onedriveId || item.id
                              setOneDriveFolderHierarchy(prev => [...prev, [onedriveId, item.name]])
                              fetchOneDriveFiles(onedriveId)
                            }
                          }
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {(activeSource === 'droply') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all duration-200 touch-manipulation"
                            onClick={() => {
                              setRenamingFile(item)
                              if (item.isFolder) {
                                // For folders, use the full name
                                setNewFileName(item.name)
                                setFileExtension('')
                              } else {
                                // For files, extract the name without extension
                                const lastDotIndex = item.name.lastIndexOf('.')
                                if (lastDotIndex > 0) {
                                  const nameWithoutExt = item.name.substring(0, lastDotIndex)
                                  const ext = item.name.substring(lastDotIndex)
                                  setNewFileName(nameWithoutExt)
                                  setFileExtension(ext)
                                } else {
                                  // No extension found
                                  setNewFileName(item.name)
                                  setFileExtension('')
                                }
                              }
                              setRenameDialogOpen(true)
                            }}
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
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
        </>
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
            <div className="flex items-center gap-2">
              <Input
                value={newFileName}
                onChange={(e) => {
                  // Remove any extension the user tries to add
                  let value = e.target.value
                  if (!renamingFile?.isFolder && fileExtension) {
                    // Remove any extension that might have been typed
                    value = value.replace(/\.[^.]*$/, '')
                  }
                  setNewFileName(value)
                }}
                placeholder={renamingFile?.isFolder ? "Enter new folder name" : "Enter new file name"}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename()
                  }
                }}
                className="flex-1"
              />
              {!renamingFile?.isFolder && fileExtension && (
                <span className="text-muted-foreground text-sm font-medium px-2 py-2 border rounded-md bg-muted">
                  {fileExtension}
                </span>
              )}
            </div>
            {!renamingFile?.isFolder && fileExtension && (
              <p className="text-xs text-muted-foreground mt-2">
                File extension {fileExtension} will be preserved
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg hover:scale-105 transition-all duration-200"
              onClick={() => {
                setRenameDialogOpen(false)
                setRenamingFile(null)
                setNewFileName('')
                setFileExtension('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newFileName.trim() || isRenaming || (() => {
                // Check if the name actually changed
                if (!renamingFile) return true
                let finalName = newFileName.trim()
                if (!renamingFile.isFolder && fileExtension) {
                  const nameWithoutExt = finalName.replace(/\.[^.]*$/, '')
                  finalName = nameWithoutExt + fileExtension
                }
                return finalName === renamingFile.name
              })()}
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