"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SignOutButton, useUser, UserButton } from '@clerk/nextjs'
import UploadExample from '@/components/FileUpload'
import prettyBytes from 'pretty-bytes';
import { ArrowBigLeft, ExternalLink, File, Folder, FolderPlus, Share2, Trash2Icon } from 'lucide-react'
import { Bounce, ToastContainer, toast } from 'react-toastify';
import dateFormat from 'dateformat'


export interface File {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  fileUrl: string;
  thumbnailUrl: string;
  userId: string;
  parentId?: string | null;
  isFolder: boolean;
  isStarred: boolean;
  isTrash: boolean;
  createdAt: string; // or Date, depending on how you parse it
  updatedAt: string; // or Date, depending on how you parse it
}


const Page: React.FC = () => {  

    const [media, setMedia] = React.useState<File[]>([])

    const [folderName, setFolderName] = React.useState<string>('')

    const uploadRef = useRef<any>(null)

    const [folderHierarchy, setFolderHierarchy] = useState<[string, string][]>([["00000000-0000-0000-0000-000000000000", "main"]])

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
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Bounce,
      });

    const notifySuccess = (message: string) => toast.success(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Bounce,
    })


    useEffect(() => {
      fetchUserMedia()
    }, [uploadRef])

    const { isSignedIn, user } = useUser()
    if(!isSignedIn) return
    return (
      <>
        <pre>
          {user.emailAddresses[0].emailAddress}
        </pre>
        <SignOutButton 
          redirectUrl='/signup'
        />
        <UserButton/>
        <br />
        <UploadExample fileInputRef={uploadRef} parentId={folderHierarchy[folderHierarchy.length - 1][0]} />

        <br /><br />

        <input type="text" name="" id="" 
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder='Folder Name'
        />

        <button
        onClick={async () => {
          const response = await fetch('/api/folders/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: folderName,
              userId: user.id,
              parentId: folderHierarchy[folderHierarchy.length - 1][0],
            }),
          })
          const data = await response.json()
          if (data.success) {
            setFolderName('')
            fetchUserMedia()
            notifySuccess("Folder created successfully")
          } else {
            notifyError(data.message)
            console.error(data.message)
          }
        }}          
         ><FolderPlus/></button>  
         <br />

        <div className='flex gap-5'>
        <button
          onClick={() => {
            setFolderHierarchy(prev => prev.slice(0, prev.length - 1))
            fetchUserMedia()
          }}
        ><ArrowBigLeft/></button>

        <div>
          {folderHierarchy.map((item, idx) => (
            <span key={item[0]}>
              {idx > 0 && " / "}
              {item[1]}
            </span>
          ))}
        </div>
        </div>

        <br />

        <ToastContainer />
        <div className='m-5'>
          {
            media.length > 0 && (
              media.map(media => (
                (media.parentId === folderHierarchy[folderHierarchy.length - 1][0]) && (<div key={media.id}>
                  {media.isFolder ? (
                  <div className='flex gap-3 items-center'>
                    <div className='my-5 flex gap-3' onClick={() => {
                    setFolderHierarchy(prev => [...prev, [media.id, media.name]])
                    fetchUserMedia()
                  }}><Folder />{media.name}</div>
                    <div
                      onClick={async () => {
                        const response = await fetch('/api/folders/delete', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            fileId: media.id,
                            userId: user.id,
                          }),
                        })
                        const data = await response.json()
                        if (data.message) {
                          fetchUserMedia()
                          notifySuccess("Folder deleted successfully")
                          fetchUserMedia()
                        } else {
                          notifyError(data.message)
                          console.error(data.message)
                        }
                      }}
                    >
                      <Trash2Icon color='red'/>
                    </div>
                  </div>
                  ) : (
                  <div className='my-5 flex gap-3'>
                    <span>
                      <File/>
                    </span>
                    <h1>
                      {media.name.length > 10
                      ? `${media.name.slice(0, 15)}...`
                      : media.name}
                    </h1>
                    {/* <ImageKitProvider urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}>
                    <Image
                      src={media.thumbnailUrl}
                      alt={media.name}
                      width={200}
                      height={200}
                      transformation={[
                      { aiUpscale: true }
                      ]}
                    />
                    </ImageKitProvider> */}
                    <p>{prettyBytes(media.size)}</p>
                    <p>{media.type}</p>
                    <p>{dateFormat(media.createdAt)}</p>
                    <p><a href={media.fileUrl} target='_blank'><ExternalLink/></a></p>
                    <button
                      onClick={async () => 
                        {
                          const response = await fetch('/api/delete-media', {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              fileId: media.id,
                              userId: user.id,
                            }),
                          })
                          const data = await response.json()
                          if (data.message) {
                            fetchUserMedia()
                            notifySuccess("Media deleted successfully")
                          } else {
                            notifyError(data.message)
                            console.error(data.message)
                          }
                        }
                      }
                    >
                      <Trash2Icon color='red'/>
                    </button>
                    <div>
                      <Share2 onClick={() => {
                        navigator.clipboard.writeText(media.fileUrl)
                        notifySuccess("File URL copied to clipboard")
                      }} />  
                    </div>
                  </div>
                  )}
                </div>)
              ))
            )
          }
        </div>
      </>
    )
}

export default Page