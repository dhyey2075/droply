"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import UploadExample from '@/components/FileUpload'
import { IndexingStatusBadge } from '@/components/IndexingStatusBadge'
import { AppShell } from '@/components/app/AppShell'
import prettyBytes from 'pretty-bytes'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Cloud,
  ExternalLink,
  File as FileIcon,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { FileIcon as TypeIcon, defaultStyles, type DefaultExtensionType } from 'react-file-icon'
import { Bounce, ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import dateFormat from 'dateformat'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MEDIA_SIZE_OPTIONS,
  MEDIA_TYPE_OPTIONS,
  ROOT_FOLDER_ID,
} from "@/lib/media/filters"
import { cn } from "@/lib/utils"
import type { MediaSizeFilter, MediaTypeFilter } from "@/schemas/mediaQuerySchema"

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
  indexingStatus?: 'INVALID' | 'PENDING' | 'INPROGRESS' | 'COMPLETED' | 'FAILED'
  indexError?: string | null
  chunkCount?: number | null
  indexedAt?: string | null
  createdAt: string
  updatedAt: string
  gdriveId?: string
  gdriveParents?: string[]
  onedriveId?: string
}

const INDEX_STATES = new Set(['PENDING', 'INPROGRESS', 'COMPLETED', 'FAILED'])

const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

/** A document page in the file type's colour. The extension label is only
 *  drawn when the icon is large enough to read it. */
function TypeGlyph({ name, label, className }: { name: string; label?: boolean; className: string }) {
  const ext = extensionOf(name)
  const base = defaultStyles[ext as DefaultExtensionType]
  // Only Office types ship a page colour; every other category gets one here,
  // so no icon is a white page that disappears on a dark surface.
  const tone = base?.color ? null : TYPE_TONES[base?.type ?? 'binary'] ?? TYPE_TONES.binary
  const style = tone
    ? { ...base, color: tone[0], foldColor: tone[1], labelColor: tone[0], glyphColor: 'rgba(255,255,255,0.55)' }
    : base
  return (
    <span className={cn('block shrink-0', className)} aria-hidden>
      <TypeIcon extension={label ? ext : ''} labelUppercase radius={4} {...style} />
    </span>
  )
}

// [page, fold] per file category
const TYPE_TONES: Record<string, [string, string]> = {
  acrobat: ['#d93831', '#b52b26'],
  document: ['#2c5898', '#254a80'],
  spreadsheet: ['#1a754c', '#16613f'],
  presentation: ['#d14423', '#ae3a1e'],
  compressed: ['#a0773a', '#82602e'],
  image: ['#7a5ac8', '#6247a6'],
  code: ['#2b8590', '#216a73'],
  code2: ['#2b8590', '#216a73'],
  audio: ['#c2457a', '#9f3663'],
  video: ['#c8791c', '#a46316'],
  font: ['#5b6475', '#485061'],
  vector: ['#5b6475', '#485061'],
  binary: ['#6b7280', '#555b67'],
}

const isImage = (item: File) =>
  !item.isFolder && /^image/.test(item.type || '') && Boolean(item.thumbnailUrl)

function FileGlyph({ item, size }: { item: File; size: 'sm' | 'lg' }) {
  if (item.isFolder) {
    return size === 'sm' ? (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
        <Folder className="size-4 fill-brand/20" />
      </span>
    ) : (
      <Folder className="size-12 fill-brand/15 text-brand" strokeWidth={1.5} />
    )
  }
  if (size === 'sm' && isImage(item)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.thumbnailUrl} alt="" className="size-8 shrink-0 rounded-md object-cover ring-1 ring-border" />
    )
  }
  return size === 'sm' ? (
    <span className="flex size-8 shrink-0 items-center justify-center">
      <TypeGlyph name={item.name} className="w-[22px]" />
    </span>
  ) : (
    <TypeGlyph name={item.name} label className="w-14" />
  )
}

function ItemActions({
  item,
  canRename,
  deleting,
  onRename,
  onCopy,
  onOpen,
  onDelete,
}: {
  item: File
  canRename: boolean
  deleting: boolean
  onRename: () => void
  onCopy: () => void
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          title="More actions"
          disabled={deleting}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {!item.isFolder && (
          <>
            <DropdownMenuItem onSelect={onOpen}>
              <ExternalLink />
              Open in new tab
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCopy}>
              <Link2 />
              Copy link
            </DropdownMenuItem>
          </>
        )}
        {canRename && (
          <DropdownMenuItem onSelect={onRename}>
            <Pencil />
            Rename
          </DropdownMenuItem>
        )}
        {(!item.isFolder || canRename) && <DropdownMenuSeparator />}
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Status({ item }: { item: File }) {
  if (item.isFolder || !item.indexingStatus || !INDEX_STATES.has(item.indexingStatus)) {
    return <span className="text-muted-foreground/60">—</span>
  }
  return <IndexingStatusBadge status={item.indexingStatus} error={item.indexError} />
}

const Page: React.FC = () => {
  const [media, setMedia] = useState<File[]>([])
  const [folderName, setFolderName] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const uploadRef = useRef<HTMLInputElement>(null)
  const prevFolderIdRef = useRef<string | null>(null)
  const hasFetchedMediaRef = useRef(false)
  const [folderHierarchy, setFolderHierarchy] = useState<[string, string][]>([[ROOT_FOLDER_ID, ""]])
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [renamingFile, setRenamingFile] = useState<File | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState<boolean>(false)
  const [newFileName, setNewFileName] = useState<string>('')
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false)
  const [newFolderOpen, setNewFolderOpen] = useState<boolean>(false)
  const [activeSource] = useState<'droply' | 'gdrive' | 'onedrive'>('droply')
  const [isGDriveConnected, setIsGDriveConnected] = useState<boolean>(false)
  const [gDriveFiles, setGDriveFiles] = useState<File[]>([])
  const [gDriveFolderHierarchy, setGDriveFolderHierarchy] = useState<[string, string][]>([["root", "Google Drive"]])
  const [isLoadingGDrive, setIsLoadingGDrive] = useState<boolean>(false)
  const [isOneDriveConnected, setIsOneDriveConnected] = useState<boolean>(false)
  const [oneDriveFiles, setOneDriveFiles] = useState<File[]>([])
  const [oneDriveFolderHierarchy, setOneDriveFolderHierarchy] = useState<[string, string][]>([["root", "OneDrive"]])
  const [isLoadingOneDrive, setIsLoadingOneDrive] = useState<boolean>(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all')
  const [sizeFilter, setSizeFilter] = useState<MediaSizeFilter>('all')

  const { isSignedIn, user } = useUser()
  const [isMobile, setIsMobile] = useState(false)

  const currentFolderId = folderHierarchy[folderHierarchy.length - 1][0]
  const hasActiveFilters =
    Boolean(debouncedSearch) || typeFilter !== 'all' || sizeFilter !== 'all'

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const notifyError = useCallback((message: string) => toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
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
    theme: "light",
    transition: Bounce,
  }), [])

  const fetchUserMedia = useCallback(async (options?: {
    silent?: boolean
    parentId?: string
    q?: string
    type?: MediaTypeFilter
    size?: MediaSizeFilter
  }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setIsLoading(true)
    }
    try {
      const params = new URLSearchParams()
      params.set('parentId', options?.parentId ?? currentFolderId)
      const q = options?.q ?? debouncedSearch
      if (q) params.set('q', q)
      const type = options?.type ?? typeFilter
      if (type !== 'all') params.set('type', type)
      const size = options?.size ?? sizeFilter
      if (size !== 'all') params.set('size', size)

      const response = await fetch(`/api/media?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setMedia(data)
      } else if (!silent && data?.error) {
        notifyError(typeof data.error === 'string' ? data.error : 'Failed to fetch files')
      }
    } catch (error) {
      if (!silent) {
        notifyError('Failed to fetch files')
      }
      console.error('Error fetching files:', error)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [notifyError, currentFolderId, debouncedSearch, typeFilter, sizeFilter])

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
    checkGDriveStatus()
    checkOneDriveStatus()
  }, [checkGDriveStatus, checkOneDriveStatus])

  useEffect(() => {
    if (!isSignedIn) return
    const folderChanged = prevFolderIdRef.current !== currentFolderId
    prevFolderIdRef.current = currentFolderId
    // Avoid skeleton flash while typing/searching; still show loading on first load / folder change.
    const silent = hasFetchedMediaRef.current && !folderChanged
    void fetchUserMedia({ silent }).finally(() => {
      hasFetchedMediaRef.current = true
    })
  }, [isSignedIn, fetchUserMedia, currentFolderId])

  // Server-push indexing updates (SSE) — no client polling
  useEffect(() => {
    if (!isSignedIn) return

    const source = new EventSource('/api/files/indexing-stream')

    source.addEventListener('indexing', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          fileId: string
          indexingStatus: File['indexingStatus']
          indexError?: string | null
          chunkCount?: number | null
          indexedAt?: string | null
        }
        setMedia((prev) =>
          prev.map((file) =>
            file.id === payload.fileId
              ? {
                  ...file,
                  indexingStatus: payload.indexingStatus,
                  indexError: payload.indexError ?? null,
                  chunkCount: payload.chunkCount ?? file.chunkCount,
                  indexedAt: payload.indexedAt ?? file.indexedAt,
                }
              : file
          )
        )
      } catch (error) {
        console.error('Failed to parse indexing event', error)
      }
    })

    source.onerror = () => {
      // Browser will auto-reconnect EventSource
    }

    return () => {
      source.close()
    }
  }, [isSignedIn])

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

  // Droply listings are already scoped/filtered by GET /api/media (current folder + search/type/size).
  const currentFiles = activeSource === 'droply' 
    ? media
    : activeSource === 'gdrive' 
      ? gDriveFiles 
      : oneDriveFiles
  const isLoadingFiles = activeSource === 'droply' 
    ? isLoading 
    : activeSource === 'gdrive' 
      ? isLoadingGDrive 
      : isLoadingOneDrive

  const clearFilters = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setTypeFilter('all')
    setSizeFilter('all')
  }

  const typeFilterLabel =
    MEDIA_TYPE_OPTIONS.find((option) => option.value === typeFilter)?.label ?? 'All types'
  const sizeFilterLabel =
    MEDIA_SIZE_OPTIONS.find((option) => option.value === sizeFilter)?.label ?? 'Any size'

  const handleFileUploadComplete = (file?: File) => {
    if (file) {
      setMedia(prev => {
        if (prev.some(item => item.id === file.id)) return prev
        return [file, ...prev]
      })
    }
    void fetchUserMedia({ silent: true })
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
        const nextName = newFileName.trim()
        setMedia(prev =>
          prev.map(item =>
            item.id === renamingFile.id ? { ...item, name: nextName } : item
          )
        )
        if (renamingFile.isFolder) {
          setFolderHierarchy(prev =>
            prev.map(([id, name]) =>
              id === renamingFile.id ? [id, nextName] : [id, name]
            )
          )
        }
        void fetchUserMedia({ silent: true })
        notifySuccess(data.message)
        setRenameDialogOpen(false)
        setRenamingFile(null)
        setNewFileName('')
      } else {
        notifyError(data.message || 'Failed to rename')
      }
    } catch {
      notifyError('Failed to rename')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleCreateFolder = async () => {
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
        setNewFolderOpen(false)
        if (data.folder) {
          setMedia(prev => {
            if (prev.some(item => item.id === data.folder.id)) return prev
            return [data.folder, ...prev]
          })
        }
        void fetchUserMedia({ silent: true })
        notifySuccess("Folder created successfully")
      } else {
        notifyError(data.message)
      }
    } catch {
      notifyError('Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleDelete = async (item: File) => {
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
        setMedia(prev =>
          prev.filter(file =>
            file.id !== item.id && file.parentId !== item.id
          )
        )
        void fetchUserMedia({ silent: true })
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
  }

  const openFolder = (item: File) => {
    if (!item.isFolder) return
    if (activeSource === 'droply') {
      setFolderHierarchy(prev => [...prev, [item.id, item.name]])
    } else if (activeSource === 'gdrive') {
      const gdriveId = item.gdriveId || item.id
      setGDriveFolderHierarchy(prev => [...prev, [gdriveId, item.name]])
      fetchGDriveFiles(gdriveId)
    } else if (activeSource === 'onedrive') {
      const onedriveId = item.onedriveId || item.id
      setOneDriveFolderHierarchy(prev => [...prev, [onedriveId, item.name]])
      fetchOneDriveFiles(onedriveId)
    }
  }

  const copyLink = (item: File) => {
    navigator.clipboard.writeText(item.fileUrl)
    notifySuccess("File URL copied to clipboard")
  }

  const openFile = (item: File) => window.open(item.fileUrl, '_blank')

  const startRename = (item: File) => {
    setRenamingFile(item)
    setNewFileName(item.name)
    setRenameDialogOpen(true)
  }

  const isDroply = activeSource === 'droply'
  const hierarchy = isDroply
    ? folderHierarchy
    : activeSource === 'gdrive'
      ? gDriveFolderHierarchy
      : oneDriveFolderHierarchy
  const rootLabel = isDroply ? 'My files' : activeSource === 'gdrive' ? 'Google Drive' : 'OneDrive'
  const crumbLabel = (idx: number) => (idx === 0 ? rootLabel : hierarchy[idx][1] || 'Untitled')
  const pageTitle = crumbLabel(hierarchy.length - 1)
  const showList = isMobile || viewMode === 'list'

  const navigateTo = (idx: number) => {
    if (isDroply) {
      setFolderHierarchy(prev => prev.slice(0, idx + 1))
    } else if (activeSource === 'gdrive') {
      setGDriveFolderHierarchy(prev => prev.slice(0, idx + 1))
      fetchGDriveFiles(gDriveFolderHierarchy[idx][0])
    } else {
      setOneDriveFolderHierarchy(prev => prev.slice(0, idx + 1))
      fetchOneDriveFiles(oneDriveFolderHierarchy[idx][0])
    }
  }

  const actionsFor = (item: File) => ({
    item,
    canRename: isDroply,
    deleting: deletingFiles.has(item.id),
    onRename: () => startRename(item),
    onCopy: () => copyLink(item),
    onOpen: () => openFile(item),
    onDelete: () => void handleDelete(item),
  })

  const meta = (item: File) =>
    item.isFolder ? 'Folder' : `${prettyBytes(item.size)} · ${dateFormat(item.createdAt, "mmm d, yyyy")}`

  const connectState = (provider: 'gdrive' | 'onedrive') => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-20 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Cloud className="size-5" />
      </span>
      <p className="font-medium">Connect {provider === 'gdrive' ? 'Google Drive' : 'OneDrive'}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Connect your {provider === 'gdrive' ? 'Google Drive' : 'OneDrive'} account to access and manage your files from one place.
      </p>
      <Button className="mt-5" onClick={provider === 'gdrive' ? handleGDriveConnect : handleOneDriveConnect}>
        <Cloud className="size-4" />
        Connect {provider === 'gdrive' ? 'Google Drive' : 'OneDrive'}
      </Button>
    </div>
  )

  const filterButton = (active: boolean) =>
    cn(
      "h-9 shrink-0 gap-1.5 font-normal",
      active && "border-brand/30 bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand"
    )

  return (
    <AppShell>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {activeSource === 'gdrive' && !isGDriveConnected ? (
            connectState('gdrive')
          ) : activeSource === 'onedrive' && !isOneDriveConnected ? (
            connectState('onedrive')
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  {hierarchy.length > 1 && (
                    <nav aria-label="Breadcrumb" className="mb-1.5 flex min-w-0 items-center gap-1 overflow-x-auto text-sm text-muted-foreground scrollbar-hide">
                      {hierarchy.slice(0, -1).map((item, idx) => (
                        <React.Fragment key={item[0]}>
                          <button
                            type="button"
                            onClick={() => navigateTo(idx)}
                            className="shrink-0 whitespace-nowrap rounded-sm transition-colors hover:text-foreground"
                          >
                            {crumbLabel(idx)}
                          </button>
                          <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                        </React.Fragment>
                      ))}
                    </nav>
                  )}
                  <div className="flex min-w-0 items-center gap-1.5">
                    {hierarchy.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-ml-2 shrink-0 text-muted-foreground"
                        onClick={() => navigateTo(hierarchy.length - 2)}
                        title="Go back"
                      >
                        <ArrowLeft className="size-4" />
                      </Button>
                    )}
                    <h1 className="truncate text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{pageTitle}</h1>
                  </div>
                </div>

                {isDroply && (
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
                    <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                      <FolderPlus className="size-4" />
                      New folder
                    </Button>
                    <UploadExample
                      fileInputRef={uploadRef}
                      parentId={currentFolderId}
                      onUploadComplete={handleFileUploadComplete}
                    />
                  </div>
                )}
              </div>

              {isDroply && (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search this folder"
                      className="h-9 pl-9 pr-9"
                      aria-label="Search file names in current folder"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setSearchInput('')
                          setDebouncedSearch('')
                        }}
                        title="Clear search"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className={filterButton(typeFilter !== 'all')}>
                          <FileIcon className="size-4" />
                          {typeFilterLabel}
                          <ChevronDown className="size-3.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel>File type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={typeFilter}
                          onValueChange={(value) => setTypeFilter(value as MediaTypeFilter)}
                        >
                          {MEDIA_TYPE_OPTIONS.map((option) => (
                            <DropdownMenuRadioItem key={option.value} value={option.value}>
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className={filterButton(sizeFilter !== 'all')}>
                          <HardDrive className="size-4" />
                          {sizeFilterLabel}
                          <ChevronDown className="size-3.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>File size</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={sizeFilter}
                          onValueChange={(value) => setSizeFilter(value as MediaSizeFilter)}
                        >
                          {MEDIA_SIZE_OPTIONS.map((option) => (
                            <DropdownMenuRadioItem key={option.value} value={option.value}>
                              <span className="flex flex-col">
                                <span>{option.label}</span>
                                {option.value !== 'all' && (
                                  <span className="text-xs text-muted-foreground">{option.description}</span>
                                )}
                              </span>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 shrink-0 gap-1.5 font-normal text-muted-foreground"
                        onClick={clearFilters}
                        title="Clear search and filters"
                      >
                        <X className="size-4" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="ml-auto hidden items-center gap-3 sm:flex">
                    {!isLoadingFiles && (
                      <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                        {currentFiles.length} {currentFiles.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                    <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label="View">
                      {([['list', List, 'List view'], ['grid', LayoutGrid, 'Grid view']] as const).map(([mode, Icon, label]) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={viewMode === mode}
                          title={label}
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md transition-colors",
                            viewMode === mode ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                {isLoadingFiles ? (
                  showList ? (
                    <div className="overflow-hidden rounded-xl border bg-card">
                      <div className="h-9 border-b bg-muted/40" />
                      <div className="divide-y">
                        {[62, 48, 70, 54, 40, 58].map((w, index) => (
                          <div key={index} className="flex h-14 animate-pulse items-center gap-3 px-4">
                            <div className="size-8 rounded-md bg-muted" />
                            <div className="h-3 rounded bg-muted" style={{ width: `${w * 0.5}%` }} />
                            <div className="ml-auto hidden h-3 w-16 rounded bg-muted sm:block" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {[...Array(10)].map((_, index) => (
                        <div key={index} className="animate-pulse overflow-hidden rounded-xl border bg-card">
                          <div className="aspect-[4/3] bg-muted/60" />
                          <div className="space-y-2 p-3">
                            <div className="h-3 w-3/4 rounded bg-muted" />
                            <div className="h-2.5 w-1/2 rounded bg-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : currentFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-20 text-center">
                    <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      {hasActiveFilters ? <Search className="size-5" /> : <FolderOpen className="size-5" />}
                    </span>
                    <p className="font-medium">
                      {activeSource === 'gdrive'
                        ? 'No files in Google Drive'
                        : activeSource === 'onedrive'
                          ? 'No files in OneDrive'
                          : hasActiveFilters
                            ? 'No matching files'
                            : 'This folder is empty'}
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {activeSource === 'gdrive'
                        ? 'Files from your Google Drive will appear here'
                        : activeSource === 'onedrive'
                          ? 'Files from your OneDrive will appear here'
                          : hasActiveFilters
                            ? 'Try a different name, type, or size filter in this folder'
                            : 'Upload files or create a folder to get started'}
                    </p>
                    {isDroply && hasActiveFilters && (
                      <Button variant="outline" className="mt-5" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                    {isDroply && !hasActiveFilters && (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button onClick={() => uploadRef.current?.click()}>
                          <Upload className="size-4" />
                          Upload a file
                        </Button>
                        <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                          <FolderPlus className="size-4" />
                          New folder
                        </Button>
                      </div>
                    )}
                  </div>
                ) : showList ? (
                  <div className="overflow-hidden rounded-xl border bg-card">
                    <table className="w-full table-fixed text-sm">
                      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="h-9 px-4 font-medium">Name</th>
                          {isDroply && <th className="hidden w-32 px-3 font-medium md:table-cell">Status</th>}
                          <th className="hidden w-24 px-3 text-right font-medium sm:table-cell">Size</th>
                          <th className="hidden w-36 px-3 font-medium lg:table-cell">Uploaded</th>
                          <th className="w-24 px-2"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {currentFiles.map(item => (
                          <tr
                            key={item.id}
                            className={cn("group h-14 transition-colors hover:bg-muted/40", item.isFolder && "cursor-pointer")}
                            onClick={item.isFolder ? () => openFolder(item) : undefined}
                          >
                            <td className="px-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <FileGlyph item={item} size="sm" />
                                <div className="min-w-0">
                                  {item.isFolder ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openFolder(item)
                                      }}
                                      className="block max-w-full truncate text-left font-medium hover:underline hover:underline-offset-4"
                                    >
                                      {item.name}
                                    </button>
                                  ) : (
                                    <span className="block truncate font-medium" title={item.name}>{item.name}</span>
                                  )}
                                  <span className="block truncate text-xs text-muted-foreground sm:hidden">{meta(item)}</span>
                                </div>
                              </div>
                            </td>
                            {isDroply && (
                              <td className="hidden px-3 md:table-cell">
                                <Status item={item} />
                              </td>
                            )}
                            <td className="hidden px-3 text-right text-muted-foreground tabular-nums sm:table-cell">
                              {item.isFolder ? <span className="text-muted-foreground/60">—</span> : prettyBytes(item.size)}
                            </td>
                            <td className="hidden px-3 text-muted-foreground lg:table-cell">
                              {dateFormat(item.createdAt, "mmm d, yyyy")}
                            </td>
                            <td className="px-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-0.5">
                                {!item.isFolder && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="hidden text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:inline-flex"
                                    onClick={() => copyLink(item)}
                                    title="Copy link"
                                  >
                                    <Link2 className="size-4" />
                                  </Button>
                                )}
                                <ItemActions {...actionsFor(item)} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {currentFiles.map(item => {
                      const preview = isImage(item) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <FileGlyph item={item} size="lg" />
                      )
                      const previewClass = "flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b bg-muted/40"
                      return (
                        <div key={item.id} className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20">
                          {item.isFolder ? (
                            <button type="button" className={previewClass} onClick={() => openFolder(item)} aria-label={`Open ${item.name}`}>
                              {preview}
                            </button>
                          ) : (
                            <div className={previewClass}>{preview}</div>
                          )}
                          <div className="flex items-start gap-1 py-2.5 pl-3 pr-1.5">
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{item.isFolder ? 'Folder' : prettyBytes(item.size)}</span>
                                {isDroply && !item.isFolder && item.indexingStatus && INDEX_STATES.has(item.indexingStatus) && (
                                  <IndexingStatusBadge status={item.indexingStatus} error={item.indexError} />
                                )}
                              </div>
                            </div>
                            <ItemActions {...actionsFor(item)} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Dialog
        open={newFolderOpen}
        onOpenChange={(open) => {
          setNewFolderOpen(open)
          if (!open) setFolderName('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Create a folder in {pageTitle}.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreateFolder()
            }}
          >
            <Input
              autoFocus
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!folderName.trim() || isCreatingFolder}>
                {isCreatingFolder && <Loader2 className="size-4 animate-spin" />}
                Create folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renamingFile?.isFolder ? 'folder' : 'file'}</DialogTitle>
            <DialogDescription>
              Enter a new name for {renamingFile?.isFolder ? 'this folder' : 'this file'}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleRename()
            }}
          >
            <Input
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new name"
            />
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false)
                  setRenamingFile(null)
                  setNewFileName('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFileName.trim() || newFileName.trim() === renamingFile?.name || isRenaming}
              >
                {isRenaming && <Loader2 className="size-4 animate-spin" />}
                {isRenaming ? 'Renaming…' : 'Rename'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </AppShell>
  )
}

export default Page
